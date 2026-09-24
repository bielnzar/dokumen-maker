import pytest
from pathlib import Path
from services.ocr_service import OCRService

def test_ocr_extract_real_lhp():
    """Test OCR extraction with real LHP file"""
    service = OCRService()

    lhp_path = "docs/LHP/Laporan Hasil Pemeriksaan Fiber Optic Koneksi 4 Unit QCC Baru.pdf"
    if not Path(lhp_path).exists():
        pytest.skip(f"LHP file not found: {lhp_path}")

    # Extract text
    result = service.extract_text(lhp_path)

    # Verify extraction
    assert len(result) > 1000, "Extracted text too short"
    assert "--- PAGE" in result, "Missing page markers"
    assert "Fiber Optic" in result or "FO" in result, "Missing expected content"

    print(f"\n✓ OCR extracted {len(result)} characters")
    print(f"✓ First 200 chars: {result[:200]}")
