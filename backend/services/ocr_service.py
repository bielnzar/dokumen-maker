import easyocr
import numpy as np
from pdf2image import convert_from_path
from pathlib import Path
from typing import Optional, Callable
from utils.logger import setup_logger

logger = setup_logger("ocr_service")

class OCRService:
    def __init__(self, use_gpu: bool = True, languages: list = None):
        self.use_gpu = use_gpu
        self.languages = languages or ['id', 'en']
        self._reader = None

    @property
    def reader(self) -> easyocr.Reader:
        if self._reader is None:
            logger.info(f"Initializing EasyOCR with GPU={self.use_gpu}")
            self._reader = easyocr.Reader(
                self.languages,
                gpu=self.use_gpu
            )
        return self._reader

    def _extract_with_pdftotext(self, pdf_path: Path, progress_callback: Optional[Callable] = None) -> Optional[str]:
        """Attempt instant digital text extraction using pdftotext.
        Returns text if valid digital content exists, else None for scanned PDFs."""
        try:
            import subprocess
            res = subprocess.run(
                ['pdftotext', str(pdf_path), '-'],
                capture_output=True,
                text=True,
                timeout=10,
                check=False
            )
            if res.returncode != 0 or not res.stdout:
                return None

            pages = res.stdout.split('\x0c')
            if pages and not pages[-1].strip():
                pages = pages[:-1]

            if not pages:
                return None

            total_pages = len(pages)
            total_chars = sum(len(p.strip()) for p in pages)

            # If total text across all pages is under 80 characters, it's likely a scan without text layer
            if total_chars < 80 or (total_chars / max(1, total_pages)) < 25:
                logger.info(f"Insufficient digital text ({total_chars} chars across {total_pages} pages). Falling back to EasyOCR.")
                return None

            logger.info(f"Detected digital PDF with {total_pages} pages ({total_chars} chars). Extracting instantly...")
            full_text = ''
            for page_num, page_content in enumerate(pages, start=1):
                clean_page = page_content.strip()
                if progress_callback:
                    progress_callback(page_num, total_pages, f"Membaca halaman {page_num}/{total_pages}")
                full_text += f"--- PAGE {page_num} ---\n{clean_page}\n\n"

            return full_text
        except Exception as e:
            logger.warning(f"pdftotext check skipped due to error: {e}. Falling back to EasyOCR.")
            return None

    def extract_text(self, pdf_path: str, dpi: int = 180, progress_callback: Optional[Callable] = None) -> str:
        """Extract text from PDF using smart native extraction with EasyOCR fallback

        Args:
            pdf_path: Path to PDF file
            dpi: DPI for PDF to image conversion (default 180 for optimal CPU speed & clarity)
            progress_callback: Optional callback(current_page, total_pages, message)
        """
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        # 1. Fast Path: Native Digital Text (0.02s)
        digital_text = self._extract_with_pdftotext(pdf_path, progress_callback)
        if digital_text:
            logger.info(f"Fast extraction successful: {len(digital_text)} characters")
            return digital_text

        # 2. Fallback Path: Scanned Image PDF via EasyOCR
        logger.info(f"Extracting scanned text from {pdf_path.name} using EasyOCR (DPI={dpi})")
        images = convert_from_path(str(pdf_path), dpi=dpi)
        total_pages = len(images)
        full_text = ''

        for page_num, image in enumerate(images, start=1):
            logger.debug(f"OCR page {page_num}/{total_pages}")

            if progress_callback:
                progress_callback(page_num, total_pages, f"Memindai halaman {page_num}/{total_pages} dengan OCR...")

            image_array = np.array(image)
            results = self.reader.readtext(image_array)

            page_text = ''
            for (bbox, text, confidence) in results:
                if confidence > 0.5:
                    page_text += text + '\n'

            full_text += f"--- PAGE {page_num} ---\n{page_text}\n\n"

        logger.info(f"EasyOCR extracted {len(full_text)} characters")
        return full_text

    def cleanup_text(self, raw_text: str) -> str:
        """Basic text cleanup"""
        # Remove excessive whitespace
        text = ' '.join(raw_text.split())
        return text
