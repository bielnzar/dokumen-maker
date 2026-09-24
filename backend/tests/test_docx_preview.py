"""
Test docx to HTML preview conversion using mammoth.
Goal: Show full document preview in browser (all sections, not just dynamic).
"""
import sys
from pathlib import Path

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from mammoth import convert_to_html
from services.docx_service import DOCXService
from strategies.factory import StrategyFactory
from datetime import datetime

# Create output_test directory
OUTPUT_TEST_DIR = Path(__file__).parent.parent / "output_test"
OUTPUT_TEST_DIR.mkdir(exist_ok=True)

# Mock data
MOCK_DATA = {
    "project_name": "Pengadaan Perangkat Radio HT",
    "timeline": "3 bulan sejak PO terbit",
    "work_type": "Pengadaan Peralatan Komunikasi",
    "location": "PT TPS Dermaga Tanjung Priok",
    "document_type": "PENGADAAN",
    "termin_count": 3,
    "payment_terms": {
        "termin_1_percent": "33.3",
        "termin_2_percent": "33.3",
        "termin_3_percent": "33.4",
    },
    "work_activities": [
        "Melakukan pengadaan dan uji fungsi perangkat Radio HT beserta aksesoris pendukungnya untuk operasional security dan mekanik CC",
        "Melakukan pengujian fungsionalitas seluruh perangkat radio yang telah diadakan untuk memastikan kesiapan operasional",
        "Melakukan dukungan teknis dan troubleshooting selama masa garansi untuk memastikan performa optimal",
    ],
    "items": [
        {"no": "1", "uraian": "Radio HT Motorola GP338", "volume": "10", "satuan": "Unit", "harga_satuan": "3500000"},
        {"no": "2", "uraian": "Baterai HT Lithium", "volume": "20", "satuan": "Unit", "harga_satuan": "500000"},
        {"no": "3", "uraian": "Charger Desktop", "volume": "10", "satuan": "Unit", "harga_satuan": "750000"},
    ]
}


def test_docx_to_html_conversion():
    """Test converting filled docx to HTML for preview"""
    docx_service = DOCXService()
    doc_type = MOCK_DATA["document_type"]
    strategy = StrategyFactory.create(doc_type)

    # Build template data
    from datetime import datetime
    template_data = {
        "project_name": MOCK_DATA["project_name"],
        "timeline": MOCK_DATA["timeline"],
        "work_type": MOCK_DATA["work_type"],
        "date": datetime.now().strftime("%d %B %Y"),
        "work_activities": MOCK_DATA["work_activities"],
    }

    # Add termin to template_data
    termin_count = MOCK_DATA.get("termin_count", 1)
    if termin_count > 0 and not MOCK_DATA.get("payment_terms"):
        percentage_per_termin = 100 / termin_count
        payment_terms = {}
        for i in range(1, termin_count + 1):
            payment_terms[f"termin_{i}_percent"] = f"{percentage_per_termin:.1f}"
            payment_terms[f"termin_{i}_condition"] = ""
        MOCK_DATA["payment_terms"] = payment_terms

    payment_content = strategy.format_payment_content(MOCK_DATA)
    if payment_content:
        template_data["pasal10_content"] = payment_content

    list_placeholders = ["work_activities", "pasal10_content"]

    # Also generate RKS preview
    rks_base = strategy.get_template_name("RKS")
    rks_doc = docx_service.load_template(rks_base, "RKS")

    items_with_numbers = [{**item, 'NO': i} for i, item in enumerate(MOCK_DATA.get("items", []), 1)]
    rks_table = docx_service.add_items_table_no_price(rks_doc, items_with_numbers, placeholder="{{pasal3_table}}")

    rks_doc = docx_service.fill_template(rks_doc, template_data, list_placeholders=list_placeholders)

    # Use service method for HTML conversion (includes post-processing)
    rks_html = docx_service.docx_to_html(rks_doc)

    rks_html_output = OUTPUT_TEST_DIR / "preview_test_rks.html"
    with open(rks_html_output, 'w', encoding='utf-8') as html_file:
        html_file.write(rks_html)

    print(f"\nRKS HTML saved: {rks_html_output}")

    print("\n=== PREVIEW GENERATED ===")
    print(f"Open in browser:")
    print(f"  RKS: {rks_html_output}")


if __name__ == '__main__':
    test_docx_to_html_conversion()