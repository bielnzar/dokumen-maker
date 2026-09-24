# strategies/padiumkm_strategy.py
from typing import Dict, Any, List, Optional
from .base import DocumentStrategy

class PadiumkmStrategy(DocumentStrategy):
    """Strategy for PADI_UMKM document type"""

    def get_payment_config(self) -> Dict[str, Any]:
        return {
            'show_termins': False,
            'allow_multiple': False,
            'fixed_payment': '100% via padiumkm.id'
        }

    def format_payment_content(self, data: Dict[str, Any]) -> Optional[str]:
        # Template has hardcoded payment text, don't override
        return None

    def format_work_activities(self, activities: List[str], data: Dict[str, Any] = None) -> str:
        # Fixed 2 activities for PADIUMKM (ignore input activities)
        work_type = data.get("work_type", "perangkat") if data else "perangkat"
        return f"""1. Melakukan pengadaan dan uji fungsi perangkat {work_type} hingga dinyatakan layak untuk dioperasikan.
2. Melakukan dukungan klaim garansi ke principal bila terjadi kegagalan fungsi selama masa garansi."""

    def get_work_activity_examples(self) -> str:
        return """Examples for PADIUMKM work activities:
- Melakukan pengadaan dan uji fungsi perangkat Baterai Radio HT hingga layak operasi
- Melakukan dukungan klaim garansi ke principal untuk perbaikan"""

    def get_template_name(self, doc_type: str) -> str:
        if doc_type == "RAB":
            return "pengadaan"  # Shares RAB template
        return "padiumkm"
