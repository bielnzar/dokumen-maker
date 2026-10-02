#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Starting LLM-RAB-RKS ==="

# Check .env
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    echo "Error: backend/.env not found. Run deploy.sh first."
    exit 1
fi

if grep -q "your_key_here" "$SCRIPT_DIR/backend/.env"; then
    echo "Warning: GEMINI_API_KEY not set in backend/.env"
fi

# Detect port availability
BACKEND_PORT=8090
FRONTEND_PORT=5173

if ss -tuln | grep -q ":8090 "; then
    BACKEND_PORT=8091
fi

if ss -tuln | grep -q ":5173 "; then
    FRONTEND_PORT=5174
fi

# Start backend (bound to 127.0.0.1 loopback for security - no direct public access)
echo "Starting backend on http://127.0.0.1:$BACKEND_PORT (internal only)..."
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
"$SCRIPT_DIR/backend/venv/bin/python" -m uvicorn main:app --host 127.0.0.1 --port "$BACKEND_PORT" --reload &
BACKEND_PID=$!

sleep 1
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Error: Backend failed to start!"
    exit 1
fi

# Start frontend
echo "Starting frontend on http://localhost:$FRONTEND_PORT..."
cd "$SCRIPT_DIR/frontend"
VITE_BACKEND_TARGET="http://127.0.0.1:$BACKEND_PORT" npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT &
FRONTEND_PID=$!

echo ""
echo "=== Running ==="
echo "Backend:  http://127.0.0.1:$BACKEND_PORT (Aman / internal loopback)"
echo "Frontend: http://localhost:$FRONTEND_PORT (Reverse proxy aktif ke backend)"
echo ""
echo "Press Ctrl+C to stop"

# Wait for either process
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
