# strategies/pengadaan_strategy.py
from typing import Dict, Any, List, Optional
from .base import DocumentStrategy

class PengadaanStrategy(DocumentStrategy):
    """Strategy for PENGADAAN document type"""

    def get_payment_config(self) -> Dict[str, Any]:
        return {
            'show_termins': True,
            'allow_multiple': True,
            'fixed_payment': None
        }

    def format_payment_content(self, data: Dict[str, Any]) -> Optional[List[str]]:
        payment_terms = data.get('payment_terms', {})

        # Collect all termins
        termins = []
        termin_keys = sorted(
            [k for k in payment_terms.keys() if k.startswith('termin_') and k.endswith('_percent')],
            key=lambda x: int(x.split('_')[1])
        )

        for key in termin_keys:
            termin_num = key.split('_')[1]
            percent = payment_terms.get(f'termin_{termin_num}_percent', '')
            condition = payment_terms.get(f'termin_{termin_num}_condition', '')

            if percent:
                termins.append({
                    'number': int(termin_num),
                    'percentage': percent,
                    'condition': condition
                })

        if not termins:
            return None

        # Return list for Word auto-numbering (no manual numbers in text)
        def number_to_roman(n):
            roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
                     'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI']
            return roman[n - 1] if n <= len(roman) else str(n)

        lines = []
        for termin in termins:
            roman_num = number_to_roman(termin['number'])
            lines.append(f"Termin {roman_num} sebesar {termin['percentage']}% dari Kontrak atau PO.")

        return lines

    def format_work_activities(self, activities: List[str], data: Dict[str, Any] = None) -> str:
        if not activities:
            return "- Pekerjaan ini belum didefinisikan"

        formatted = []
        for i, activity in enumerate(activities, 1):
            formatted.append(f"{i}. {activity}")
        return '\n'.join(formatted)

    def get_work_activity_examples(self) -> str:
        return """Examples for PENGADAAN work activities:
                    [
                    "Pekerjaan Pengadaan Fiber Optic Koneksi 4 (empat) unit QCC Baru merupakan upaya membangun fasilitas kabel Fiber Optic koneksi jaringan data 4 (empat) unit QCC di dermaga untuk terkoneksi ke jaringan data internal PT TPS"
                    "Melakukan Pengadaan Radio HT Kebutuhan BCMS, iPnC dan Operasional Dermaga Lapangan beserta aksesoris pendukungnya"
                    "Melakukan pengujian fungsionalitas seluruh aksesoris radio HT yang telah diadakan (Extra Mic, Baterai HT, dan Set Charger beserta adaptor) untuk memastikan kompatibilitas, kinerja optimal, dan kesiapan operasional dalam menunjang komunikasi dan koordinasi Tim Keamanan dan Tim Mekanik CC"
                    "garansi"
                    "Melakukan instalasi, splacing, labeling dan uji koneksi (OTDR) seluruh core fiber optic pada panel network terminasi di kade meter yang telah ditentukan disis dermaga, menuju panel network switch di gedung CBO lt.2."
                    ]"""

    def get_template_name(self, doc_type: str) -> str:
        return "pengadaan"  # Base name only, load_template adds prefix
