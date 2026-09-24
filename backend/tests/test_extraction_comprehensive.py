import pytest
import os
from pathlib import Path
from services.extraction_service import ExtractionService

def test_extract_all_fields_from_lhp():
    """Test extraction of all required fields from LHP"""
    if not os.getenv("GEMINI_API_KEY"):
        pytest.skip("GEMINI_API_KEY not set")

    service = ExtractionService()

    # Read from extracted OCR text
    lhp_path = "extracted/LHP/01. Laporan Hasil Pemeriksaan Perangkat Radio Komunikasi Security dan Mekanik CC_easyocr.txt"
    if not Path(lhp_path).exists():
        pytest.skip(f"Extracted LHP text not found: {lhp_path}")

    with open(lhp_path, 'r', encoding='utf-8') as f:
        lhp_text = f.read()

    # Test 1: Extract project name
    project_name = service.extract_project_name(lhp_text)
    assert project_name, "Project name not extracted"
    print(f"\n✓ Project name: {project_name}")

    # Test 2: Detect document type
    doc_type = service.detect_document_type(lhp_text)
    assert doc_type in ["PENGADAAN", "PEMELIHARAAN", "PADI_UMKM"]
    print(f"✓ Document type: {doc_type}")

    # Test 3: Extract structured data
    data = service.extract_structured_data(lhp_text, doc_type)

    # Verify all required fields exist
    required_fields = [
        "project_name", "items", "timeline", 
        "work_type", "scope_description",
        "work_activities", "payment_termins"
    ]
    for field in required_fields:
        assert field in data, f"Missing field: {field}"

    # Verify items array
    assert isinstance(data["items"], list), "Items should be list"
    assert len(data["items"]) > 0, "Items array empty"

    # Verify items have category
    if len(data["items"]) > 0:
        assert "category" in data["items"][0] or "name" in data["items"][0], "Items should have category or name"

    # Verify work_activities
    assert isinstance(data["work_activities"], list), "work_activities should be list"

    # Verify payment_termins
    assert isinstance(data["payment_termins"], list), "payment_termins should be list"

    print(f"✓ Project: {data.get('project_name')}")
    print(f"✓ Work Type: {data.get('work_type')}")
    print(f"✓ Timeline: {data.get('timeline')}")
    print(f"✓ Scope: {data.get('scope_description')}")
    print(f"✓ Items count: {len(data['items'])}")

    # Show items by category
    material_items = [i for i in data['items'] if i.get('category') == 'Material']
    jasa_items = [i for i in data['items'] if i.get('category') == 'Jasa']
    print(f"  - Material: {len(material_items)} items")
    print(f"  - Jasa: {len(jasa_items)} items")

    # Show work activities
    print(f"✓ Work Activities: {len(data.get('work_activities', []))} items")
    for i, activity in enumerate(data.get('work_activities', [])):
        print(f"  {i+1}. {activity}")

    # Show payment termins
    print(f"✓ Payment Termins: {len(data.get('payment_termins', []))} termins")
    for termin in data.get('payment_termins', []):
        print(f"  - Termin {termin.get('termin')}: {termin.get('percentage')}% ({termin.get('condition', 'N/A')})")

    # Verify work activities were generated (min 3)
    assert len(data.get('work_activities', [])) >= 3, "Should generate at least 3 work activities"
    print(f"\n✓ AI generated {len(data['work_activities'])} work activities from extracted data")
