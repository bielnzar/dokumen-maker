@echo off
echo Installing Python dependencies...

REM Install normal packages
echo Installing core dependencies...
pip install -r requirements.txt

REM Install PyTorch with CUDA
echo Installing PyTorch with CUDA support...
pip install -r requirements-cuda.txt

echo.
echo Installation complete!
