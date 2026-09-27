FROM python:3.11-slim

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies: LibreOffice (for DOCX/XLSX -> PDF), Poppler (for pdf2image), and OpenCV deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-nogpu \
    libreoffice-writer \
    libreoffice-calc \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
# Pre-install CPU-only PyTorch to prevent downloading 5GB+ CUDA dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code and templates
COPY . .

# Ensure upload and output directories exist
RUN mkdir -p uploads output

EXPOSE 8000

# Support dynamic PORT from cloud platforms (Koyeb/Render/Railway) or fallback to 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
