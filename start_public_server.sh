#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================="
echo "🚀 DokumenMaker Backend & Cloudflare Tunnel"
echo "=========================================="

# Check if backend is already running
if curl -s http://127.0.0.1:8000/health 2>/dev/null | grep -q "healthy"; then
    echo "✅ FastAPI backend is already running on port 8000."
else
    echo "📦 Starting FastAPI backend on port 8000..."
    fuser -k 8000/tcp >/dev/null 2>&1 || true
    sleep 1
    cd "$DIR/backend"
    nohup "$DIR/backend/venv/bin/uvicorn" main:app --host 0.0.0.0 --port 8000 > "$DIR/backend.log" 2>&1 &
    disown
    cd "$DIR"

    echo "⏳ Waiting for backend to start..."
    for i in {1..15}; do
        if curl -s http://127.0.0.1:8000/health 2>/dev/null | grep -q "healthy"; then
            echo "✅ Backend is healthy and running!"
            break
        fi
        sleep 1
    done
fi

# Check if Cloudflare Tunnel is already running and healthy
EXISTING_URL=""
if [ -f "$DIR/tunnel_url.txt" ]; then
    EXISTING_URL=$(cat "$DIR/tunnel_url.txt" | tr -d '[:space:]')
fi

if [ -n "$EXISTING_URL" ] && curl -s "$EXISTING_URL/health" 2>/dev/null | grep -q "healthy"; then
    echo "✅ Cloudflare Tunnel is already active and healthy!"
    echo "=========================================="
    echo "🎉 BACKEND ONLINE & PUBLIC!"
    echo "Public API URL: $EXISTING_URL"
    echo "=========================================="
    exit 0
fi

# Otherwise, restart Cloudflare Tunnel
echo "🌐 Starting Cloudflare Tunnel..."
pkill -9 -f "cloudflared tunnel" >/dev/null 2>&1 || true
rm -f "$DIR/tunnel.log" "$DIR/tunnel_url.txt"
sleep 1

nohup "$DIR/bin/cloudflared" tunnel --url http://127.0.0.1:8000 --protocol http2 > "$DIR/tunnel.log" 2>&1 &
disown

echo "⏳ Waiting for Cloudflare Tunnel URL..."
TUNNEL_URL=""
for i in {1..30}; do
    if [ -f "$DIR/tunnel.log" ]; then
        TUNNEL_URL=$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "$DIR/tunnel.log" | head -n 1 || true)
        if [ -n "$TUNNEL_URL" ]; then
            break
        fi
    fi
    sleep 1
done

if [ -n "$TUNNEL_URL" ]; then
    echo "=========================================="
    echo "🎉 BACKEND ONLINE & PUBLIC!"
    echo "Public API URL: $TUNNEL_URL"
    echo "=========================================="
    echo "$TUNNEL_URL" > "$DIR/tunnel_url.txt"
else
    echo "❌ Failed to get Cloudflare Tunnel URL. Check $DIR/tunnel.log"
    exit 1
fi
