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

    def extract_text(self, pdf_path: str, dpi: int = 300, progress_callback: Optional[Callable] = None) -> str:
        """Extract text from PDF using OCR

        Args:
            pdf_path: Path to PDF file
            dpi: DPI for PDF to image conversion
            progress_callback: Optional callback(current_page, total_pages, message)
        """
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        logger.info(f"Extracting text from {pdf_path.name}")

        # Convert PDF to images
        images = convert_from_path(str(pdf_path), dpi=dpi)
        total_pages = len(images)
        full_text = ''

        for page_num, image in enumerate(images, start=1):
            logger.debug(f"OCR page {page_num}/{total_pages}")

            # Report progress
            if progress_callback:
                progress_callback(page_num, total_pages, f"Processing page {page_num}/{total_pages}")

            # Convert PIL image to numpy array
            image_array = np.array(image)

            # Extract text
            results = self.reader.readtext(image_array)

            # Format results
            page_text = ''
            for (bbox, text, confidence) in results:
                if confidence > 0.5:
                    page_text += text + '\n'

            full_text += f"--- PAGE {page_num} ---\n{page_text}\n\n"

        logger.info(f"Extracted {len(full_text)} characters")
        return full_text

    def cleanup_text(self, raw_text: str) -> str:
        """Basic text cleanup"""
        # Remove excessive whitespace
        text = ' '.join(raw_text.split())
        return text
