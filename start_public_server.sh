#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================="
echo "🚀 Starting DokumenMaker Backend + Cloudflare Tunnel"
echo "=========================================="

# 1. Kill any existing uvicorn on port 8000 or old cloudflared
fuser -k 8000/tcp 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# 2. Start FastAPI Backend
echo "📦 Starting FastAPI backend on port 8000..."
cd "$DIR/backend"
nohup "$DIR/backend/venv/bin/uvicorn" main:app --host 0.0.0.0 --port 8000 > "$DIR/backend.log" 2>&1 &
BACKEND_PID=$!
cd "$DIR"

echo "⏳ Waiting for backend to start (PID: $BACKEND_PID)..."
for i in {1..15}; do
    if curl -s http://127.0.0.1:8000/health 2>/dev/null | grep -q "healthy"; then
        echo "✅ Backend is healthy and running!"
        break
    fi
    sleep 1
done

# 3. Start Cloudflare Tunnel
echo "🌐 Starting Cloudflare Tunnel..."
rm -f "$DIR/tunnel.log" "$DIR/tunnel_url.txt"
nohup "$DIR/bin/cloudflared" tunnel --url http://127.0.0.1:8000 --logfile "$DIR/tunnel.log" > /dev/null 2>&1 &
TUNNEL_PID=$!

echo "⏳ Waiting for Cloudflare Tunnel URL..."
TUNNEL_URL=""
for i in {1..30}; do
    if [ -f "$DIR/tunnel.log" ]; then
        TUNNEL_URL=$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "$DIR/tunnel.log" | head -n 1)
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
fi
