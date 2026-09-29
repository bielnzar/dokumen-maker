#!/usr/bin/env bash
fuser -k 8090/tcp 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
echo "✅ Backend and Cloudflare Tunnel stopped."
