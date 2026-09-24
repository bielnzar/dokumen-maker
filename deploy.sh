#!/bin/bash
set -e

echo "=== LLM-RAB-RKS Deployment Script ==="

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "[1/6] Linux detected"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "[1/6] macOS detected"
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

# === Python 3.11+ ===
echo "[2/6] Checking Python..."
if command -v python3 &> /dev/null; then
    PY_VERSION=$(python3 --version | grep -oP '\d+\.\d+' | head -1)
    PY_MAJOR=$(echo $PY_VERSION | cut -d. -f1)
    PY_MINOR=$(echo $PY_VERSION | cut -d. -f2)
    if [[ "$PY_MAJOR" -eq 3 && "$PY_MINOR" -ge 11 ]] || [[ "$PY_MAJOR" -gt 3 ]]; then
        echo "Python $PY_VERSION found — OK"
    else
        echo "Python $PY_VERSION found but need 3.11+"
        echo "Run: sudo apt update && sudo apt install python3.11 python3.11-venv python3-pip"
        exit 1
    fi
else
    echo "Python not found. Install with: sudo apt update && sudo apt install python3.11 python3.11-venv python3-pip"
    exit 1
fi

# === Node.js 18+ ===
echo "[3/6] Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | grep -oP 'v\K\d+')
    if [[ "$NODE_VERSION" -ge 18 ]]; then
        echo "Node.js $(node --version) found — OK"
    else
        echo "Node.js $(node --version) found but need 18+"
        echo "Run: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install nodejs"
        exit 1
    fi
else
    echo "Node.js not found. Run: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install nodejs"
    exit 1
fi

# === Backend ===
echo "[4/5] Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create .env if not exists
if [ ! -f .env ]; then
    echo "GEMINI_API_KEY=your_key_here" > .env
    echo ".env created — add your GEMINI_API_KEY"
fi
deactivate
cd ..

# === Frontend ===
echo "[5/5] Setting up frontend..."
cd frontend
npm install
cd ..

echo ""
echo "=== Done ==="
echo "Backend:  cd backend && source venv/bin/activate && python main.py"
echo "Frontend: cd frontend && npm run dev"
echo "Edit backend/.env with your GEMINI_API_KEY"