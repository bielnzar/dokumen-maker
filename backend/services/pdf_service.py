import shutil
import subprocess
from pathlib import Path
from typing import Optional
from utils.logger import setup_logger

logger = setup_logger("pdf_service")


class PDFService:
    """Service to convert documents (DOCX, XLSX) to PDF using LibreOffice headless"""

    def __init__(self):
        self._binary = self._find_libreoffice()
        if self._binary:
            logger.info(f"PDFService initialized with LibreOffice binary: {self._binary}")
        else:
            logger.warning("LibreOffice binary not found. PDF conversion will be unavailable.")

    def _find_libreoffice(self) -> Optional[str]:
        """Locate LibreOffice or soffice executable on the system"""
        return shutil.which("libreoffice") or shutil.which("soffice")

    def is_available(self) -> bool:
        """Check if PDF conversion is supported on this system"""
        return self._binary is not None

    def convert_to_pdf(self, input_path: Path, output_dir: Optional[Path] = None, timeout: int = 45) -> Optional[Path]:
        """Convert a DOCX or XLSX file to PDF.

        Args:
            input_path: Path to the source file (.docx or .xlsx)
            output_dir: Target directory for the resulting PDF (defaults to input_path.parent)
            timeout: Subprocess execution timeout in seconds (default 45s)

        Returns:
            Path to the generated PDF file if successful, None otherwise.
        """
        if not self.is_available():
            logger.error("Cannot convert to PDF: LibreOffice binary not found")
            return None

        input_path = Path(input_path).resolve()
        if not input_path.exists():
            logger.error(f"Input file not found for PDF conversion: {input_path}")
            return None

        target_dir = Path(output_dir).resolve() if output_dir else input_path.parent
        target_dir.mkdir(parents=True, exist_ok=True)

        expected_pdf = target_dir / (input_path.stem + ".pdf")

        cmd = [
            self._binary,
            "--headless",
            "--convert-to",
            "pdf",
            str(input_path),
            "--outdir",
            str(target_dir),
        ]

        logger.info(f"Converting {input_path.name} to PDF via LibreOffice...")
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False
            )

            if result.returncode != 0:
                logger.error(f"LibreOffice failed (code {result.returncode}): {result.stderr.strip() or result.stdout.strip()}")
                return None

            if not expected_pdf.exists():
                logger.error(f"Expected PDF file was not created: {expected_pdf}")
                return None

            logger.info(f"Successfully created PDF: {expected_pdf} ({expected_pdf.stat().st_size} bytes)")
            return expected_pdf

        except subprocess.TimeoutExpired:
            logger.error(f"PDF conversion timed out after {timeout} seconds for {input_path.name}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during PDF conversion for {input_path.name}: {e}")
            return None
