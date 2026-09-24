#!/bin/bash
echo "Installing Python dependencies..."

# Install normal packages
echo "Installing core dependencies..."
pip install -r requirements.txt

# Install PyTorch with CUDA
echo "Installing PyTorch with CUDA support..."
pip install -r requirements-cuda.txt

echo ""
echo "Installation complete!"
