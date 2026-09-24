# backend/strategies/nodin_strategy.py
from typing import Dict, Any, List, Optional
from .base import DocumentStrategy


class NodinStrategy(DocumentStrategy):
    """Strategy for NODIN document type"""

    def format_butir_1(self, items: List[Dict], data: Dict[str, Any]) -> str:
        """Format butir 1 with narrative + items list"""
        if not items:
            return "1. Pekerjaan ini belum didefinisikan"

        scope = data.get('scope_description', '')
        work_type = data.get('work_type', 'Pengadaan')

        lines = [f"Saat ini perusahaan menggunakan {scope}. Terdapat kebutuhan {work_type} dengan rincian sebagai berikut:"]

        for i, item in enumerate(items, 1):
            letter = chr(ord('a') + i - 1)
            qty = item.get('quantity', '')
            name = item.get('name', '')
            unit = item.get('unit', 'unit')
            lines.append(f"  {letter}. {name} sebanyak {qty} ({qty}) {unit}")

        return '\n'.join(lines)

    def get_template_name(self, doc_type: str) -> str:
        return "nodin"

    def format_work_activities(self, activities: List[str], data: Dict[str, Any] = None) -> str:
        return ""

    def get_work_activity_examples(self) -> str:
        return ""

    def get_payment_config(self) -> Dict[str, Any]:
        return {'show_termins': False, 'allow_multiple': False, 'fixed_payment': None}

    def format_payment_content(self, data: Dict[str, Any]) -> Optional[List[str]]:
        return None