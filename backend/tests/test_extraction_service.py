import pytest
from services.extraction_service import ExtractionService

def test_extract_project_name():
    service = ExtractionService()
    lhp_text = "LAPORAN HASIL PEMERIKSAAN PERANGKAT RADIO KOMUNIKASI"
    result = service.extract_project_name(lhp_text)
    assert "RADIO KOMUNIKASI" in result.upper()
    assert not result.upper().startswith("LAPORAN HASIL PEMERIKSAAN")

def test_clean_project_name():
    service = ExtractionService()
    raw = "LAPORAN HASIL PEMERIKSAAN PERANGKAT UPS DATA CENTER"
    cleaned = service.clean_project_name(raw)
    assert not cleaned.upper().startswith("LAPORAN HASIL PEMERIKSAAN")
    assert "PERANGKAT UPS DATA CENTER" in cleaned.upper()
    assert cleaned.upper().startswith("PENGADAAN")

def test_detect_document_type_pengadaan():
    service = ExtractionService()
    text = "PENGADAAN INFRASTRUKTUR FIBER OPTIC"
    doc_type = service.detect_document_type(text)
    assert doc_type == "PENGADAAN"
