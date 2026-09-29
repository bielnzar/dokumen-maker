#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================="
echo "🚀 DokumenMaker Backend & Ngrok Tunnel"
echo "=========================================="

BACKEND_PORT=8090
NGROK_BIN="$DIR/bin/ngrok"

if [ ! -f "$NGROK_BIN" ]; then
    echo "❌ Binary ngrok tidak ditemukan di $NGROK_BIN."
    exit 1
fi

# 1. Cek Authtoken Ngrok
if ! "$NGROK_BIN" config check >/dev/null 2>&1; then
    echo "⚠️  Authtoken Ngrok belum terpasang!"
    echo ""
    echo "Ikuti langkah mudah berikut:"
    echo "1. Buka https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "2. Salin token Anda"
    echo "3. Jalankan di terminal:"
    echo "   ./bin/ngrok config add-authtoken <TOKEN_ANDA>"
    echo ""
    echo "Setelah itu, jalankan kembali: ./start_ngrok.sh"
    exit 1
fi

# 2. Cek atau Jalankan FastAPI Backend
if curl -s "http://127.0.0.1:${BACKEND_PORT}/health" 2>/dev/null | grep -q "healthy"; then
    echo "✅ FastAPI backend sudah aktif di port ${BACKEND_PORT}."
else
    echo "📦 Menjalankan FastAPI backend pada port ${BACKEND_PORT}..."
    fuser -k "${BACKEND_PORT}/tcp" >/dev/null 2>&1 || true
    sleep 1
    cd "$DIR/backend"
    nohup "$DIR/backend/venv/bin/uvicorn" main:app --host 0.0.0.0 --port "${BACKEND_PORT}" > "$DIR/backend.log" 2>&1 &
    disown
    cd "$DIR"

    echo "⏳ Menunggu backend aktif..."
    for i in {1..15}; do
        if curl -s "http://127.0.0.1:${BACKEND_PORT}/health" 2>/dev/null | grep -q "healthy"; then
            echo "✅ Backend aktif dan sehat!"
            break
        fi
        sleep 1
    done
fi

# 3. Domain Ngrok (opsional dari argumen $1 atau file ngrok_domain.txt)
STATIC_DOMAIN=""
if [ -n "$1" ]; then
    STATIC_DOMAIN="$1"
    echo "$STATIC_DOMAIN" > "$DIR/ngrok_domain.txt"
elif [ -f "$DIR/ngrok_domain.txt" ]; then
    STATIC_DOMAIN=$(cat "$DIR/ngrok_domain.txt" | tr -d '[:space:]')
fi

# 4. Hentikan tunnel ngrok lama jika ada
pkill -9 -f "ngrok http" >/dev/null 2>&1 || true
rm -f "$DIR/ngrok.log"
sleep 1

# 5. Jalankan Ngrok Tunnel
echo "🌐 Menjalankan Ngrok Tunnel..."
if [ -n "$STATIC_DOMAIN" ]; then
    echo "📌 Menggunakan Static Domain: $STATIC_DOMAIN"
    nohup "$NGROK_BIN" http --url="$STATIC_DOMAIN" "$BACKEND_PORT" --log=stdout > "$DIR/ngrok.log" 2>&1 &
else
    nohup "$NGROK_BIN" http "$BACKEND_PORT" --log=stdout > "$DIR/ngrok.log" 2>&1 &
fi
disown

# 6. Dapatkan Public URL dari API lokal Ngrok
echo "⏳ Mengambil URL Publik Ngrok..."
PUBLIC_URL=""
for i in {1..20}; do
    if curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -q "public_url"; then
        PUBLIC_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -oE "https://[a-zA-Z0-9.-]+\.ngrok-free\.app" | head -n 1 || true)
        if [ -z "$PUBLIC_URL" ]; then
            PUBLIC_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -oE "https://[a-zA-Z0-9.-]+\.ngrok\.app" | head -n 1 || true)
        fi
        if [ -n "$PUBLIC_URL" ]; then
            break
        fi
    fi
    sleep 1
done

if [ -n "$PUBLIC_URL" ]; then
    echo "=========================================="
    echo "🎉 NGROK BACKEND ONLINE & PUBLIC!"
    echo "Public API URL: $PUBLIC_URL"
    echo "=========================================="
    echo "$PUBLIC_URL" > "$DIR/tunnel_url.txt"
    echo "💡 URL telah disimpan di tunnel_url.txt"
else
    echo "❌ Gagal mendapatkan URL Ngrok. Periksa file: $DIR/ngrok.log"
    exit 1
fi
