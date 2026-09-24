# strategies/pemeliharaan_strategy.py
from typing import Dict, Any, List, Optional
from .base import DocumentStrategy

class PemeliharaanStrategy(DocumentStrategy):
    """Strategy for PEMELIHARAAN document type"""

    def get_payment_config(self) -> Dict[str, Any]:
        return {
            'show_termins': True,
            'allow_multiple': True,
            'fixed_payment': None
        }

    def format_payment_content(self, data: Dict[str, Any]) -> Optional[List[str]]:
        payment_terms = data.get('payment_terms', {})

        termins = []
        termin_keys = sorted(
            [k for k in payment_terms.keys() if k.startswith('termin_') and k.endswith('_percent')],
            key=lambda x: int(x.split('_')[1])
        )

        for key in termin_keys:
            termin_num = key.split('_')[1]
            percent = payment_terms.get(f'termin_{termin_num}_percent', '')

            if percent:
                termins.append({
                    'number': int(termin_num),
                    'percentage': percent
                })

        if not termins:
            return None

        # Return list for Word auto-numbering (no manual numbers)
        lines = []
        for termin in termins:
            lines.append(f"Termin {termin['number']} sebesar {termin['percentage']}% dari Kontrak atau PO.")

        return lines

    def format_work_activities(self, activities: List[str], data: Dict[str, Any] = None) -> str:
        if not activities:
            return "- Pekerjaan ini belum didefinisikan"

        formatted = []
        for i, activity in enumerate(activities, 1):
            formatted.append(f"{i}. {activity}")
        return '\n'.join(formatted)

    def get_work_activity_examples(self) -> str:
        return """Examples for PEMELIHARAAN work activities:
- Melakukan perawatan rutin server dan network equipment
- Melakukan penggantian spare part yang sudah tidak layak pakai
- Melakukan monitoring dan troubleshooting jaringan"""

    def get_template_name(self, doc_type: str) -> str:
        if doc_type == "RAB":
            return "pengadaan"  # Base name only
        return "pemeliharaan"  # Base name only (no "RKS_" prefix)
