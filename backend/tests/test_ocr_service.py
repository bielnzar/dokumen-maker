import pytest
from services.ocr_service import OCRService

def test_ocr_service_init():
    service = OCRService()
    assert service.use_gpu == True
    assert service.languages == ['id', 'en']

def test_extract_from_pdf_not_found():
    service = OCRService()
    with pytest.raises(FileNotFoundError):
        service.extract_text("nonexistent.pdf")
