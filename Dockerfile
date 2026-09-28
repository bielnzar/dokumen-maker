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

# Hugging Face Spaces runs as non-root user with UID 1000
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /home/user/app

# Install Python requirements
# Pre-install CPU-only PyTorch to prevent downloading 5GB+ CUDA dependencies
COPY --chown=user backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code, strategies, templates, utils
COPY --chown=user backend/ .

# Ensure upload, output, and EasyOCR model directories exist with correct user permissions
RUN mkdir -p uploads output /home/user/.EasyOCR/model && \
    chown -R user:user /home/user

USER user

EXPOSE 7860

# Support dynamic PORT or default to 7860 (Hugging Face default)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
