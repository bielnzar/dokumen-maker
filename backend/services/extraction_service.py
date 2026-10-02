import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
import google.generativeai as genai
from typing import Dict, Any, Optional
from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger("extraction_service")

class ExtractionService:
    def __init__(self):
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(Config.GEMINI_MODEL)

    def _call_gemini(self, prompt: str, stream: bool = False, progress_callback=None) -> str:
        """Call Gemini API with retry logic and optional streaming"""
        try:
            if stream:
                logger.info("AI Streaming started...")
                response = self.model.generate_content(prompt, stream=True)
                full_text = ""

                for chunk in response:
                    if chunk.text:
                        full_text += chunk.text
                        # Log each chunk to show real-time progress
                        print(chunk.text, end='', flush=True)
                        # Send chunk to progress manager if callback provided
                        if progress_callback:
                            progress_callback(chunk.text)

                print()  # New line after streaming completes
                logger.info("AI Streaming completed")
                return full_text
            else:
                response = self.model.generate_content(prompt)
                return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise

    @staticmethod
    def clean_project_name(name: str, doc_type: str = "PENGADAAN") -> str:
        """Sanitize project name by removing LHP/Laporan prefix and ensuring proper procurement title format."""
        if not name:
            return ""

        import re
        cleaned = name.strip().strip('"\'')

        # Patterns to remove from start
        patterns = [
            r'^(?:LAPORAN\s+HASIL\s+PEMERIKSAAN\s+(?:TEKNIS\s+)?(?:DAN\s+PENGUJIAN\s+)?(?:TERKAIT\s+)?(?:ATAS\s+)?(?:KEBUTUHAN\s+)?)',
            r'^(?:HASIL\s+PEMERIKSAAN\s+(?:TEKNIS\s+)?)',
            r'^(?:LHP\s+)',
            r'^(?:LAPORAN\s+PEMERIKSAAN\s+)',
            r'^(?:PEMERIKSAAN\s+)',
        ]
        for pattern in patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE).strip()

        # Clean leading punctuation or dashes
        cleaned = re.sub(r'^[\s\-:–—]+', '', cleaned).strip()

        # If the cleaned name doesn't start with an action noun like Pengadaan, Pemeliharaan, Penggantian, Perbaikan, Pemasangan, etc.
        action_prefixes = ['PENGADAAN', 'PEMELIHARAAN', 'PENGGANTIAN', 'PERBAIKAN', 'PEMASANGAN', 'SEWA', 'JASA', 'PEKERJAAN']
        starts_with_action = any(cleaned.upper().startswith(p) for p in action_prefixes)

        if not starts_with_action and cleaned:
            prefix = 'Pemeliharaan' if doc_type == 'PEMELIHARAAN' else 'Pengadaan'
            cleaned = f"{prefix} {cleaned}"

        return cleaned.strip()

    def extract_project_name(self, lhp_text: str) -> str:
        """Extract clean project name from LHP text"""
        prompt = f"""
Extract the procurement/work project name from this LHP text.
IMPORTANT RULES:
- Do NOT include the prefix "LAPORAN HASIL PEMERIKSAAN" or "LHP".
- The project name MUST represent the actual procurement work (e.g. "Pengadaan Baterai UPS APC RBC172...", "Pengadaan Fiber Optic...", "Pemeliharaan AC Gedung...").
- Return ONLY the clean project name, no explanation.

LHP Text:
{lhp_text[:1500]}
"""
        result = self._call_gemini(prompt)
        return self.clean_project_name(result.strip(), "PENGADAAN")

    def detect_document_type(self, text: str) -> str:
        """Detect document type from text"""
        text_lower = text.lower()

        # Check for padiumkm FIRST (before general pengadaan)
        if "padiumkm" in text_lower:
            return "PADI_UMKM"

        type_keywords = {
            "PENGADAAN": ["pengadaan", "procurement", "pembelian"],
            "PEMELIHARAAN": ["pemeliharaan", "maintenance", "perawatan"]
        }

        for doc_type, keywords in type_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return doc_type

        return "PENGADAAN"  # Default

    def extract_structured_data(
        self,
        lhp_text: str,
        doc_type: str,
        deterministic_items: Optional[list] = None,
        progress_callback=None,
        ai_progress_callback=None
    ) -> Dict[str, Any]:
        """Extract structured data from LHP using Hybrid Pipeline (Deterministic items + Single-Pass LLM).
        Saves ~80-85% tokens by reusing verified table items and eliminating duplicate LLM calls.
        """
        from strategies.factory import StrategyFactory
        strategy = StrategyFactory.create(doc_type)
        examples = strategy.get_work_activity_examples()

        has_deterministic_items = bool(deterministic_items and len(deterministic_items) > 0)

        if has_deterministic_items:
            # Token-Efficient Single-Pass Prompt: Items already known, AI only drafts metadata & Pasal 2 narasi
            items_summary = "\n".join([
                f"- {it.get('uraian', '')} (Volume: {it.get('volume', '')} {it.get('satuan', '')})"
                for it in deterministic_items
            ])

            prompt = f"""You are an expert at extracting structured procurement data from Indonesian LHP documents.
The following items have already been verified from the document:
{items_summary}

Based on the LHP text below, extract metadata and generate professional work activities (Pasal 2 RKS for {doc_type}).
Return ONLY valid JSON matching this structure:
{{
  "project_name": "Name of the procurement work (e.g. Pengadaan Baterai UPS..., do NOT include Laporan Hasil Pemeriksaan)",
  "work_type": "{doc_type}",
  "timeline": "Timeline/duration (e.g. 30 hari kalender sejak PO terbit)",
  "scope_description": "Brief scope description (1-2 sentences)",
  "work_activities": [
    "1. Persiapan kerja dan pembongkaran/pelepasan unit lama...",
    "2. Pengadaan dan pemasangan unit baru...",
    "3. Pengujian fungsi (testing and commissioning)...",
    "4. Penyerahan garansi purna jual..."
  ]
}}

## Reference Work Activities for {doc_type}:
{examples}

## LHP Text:
{lhp_text[:4000]}
"""
        else:
            # Fallback Prompt for Scanned PDFs without digital table layer
            prompt = f"""You are an expert at extracting structured data from Indonesian government procurement documents (LHP).
Extract data needed to generate RAB and RKS documents for {doc_type}.
Return ONLY valid JSON.

## Required JSON Structure:
{{
  "project_name": "Name of the procurement work (do NOT include Laporan Hasil Pemeriksaan)",
  "work_type": "{doc_type}",
  "timeline": "Duration with start condition",
  "scope_description": "Brief scope description",
  "items": [
    {{
      "no": "1",
      "uraian": "Item description/name",
      "volume": "Quantity as number",
      "satuan": "Unit (unit, pcs, set, lot, etc.)",
      "harga_satuan": ""
    }}
  ],
  "work_activities": [
    "1. Activity 1...",
    "2. Activity 2..."
  ]
}}

## Reference Work Activities for {doc_type}:
{examples}

## LHP Text:
{lhp_text[:6000]}
"""

        try:
            if ai_progress_callback:
                ai_progress_callback(30)  # Request sent
            result = self._call_gemini(prompt, stream=True, progress_callback=progress_callback)
            if ai_progress_callback:
                ai_progress_callback(85)  # Response received, parsing

            # Parse JSON from response (handle markdown code blocks)
            import json
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()

            data = json.loads(result)
            data["document_type"] = doc_type
            data["project_name"] = self.clean_project_name(data.get("project_name", ""), doc_type)

            # Ensure required fields have defaults
            defaults = {
                "timeline": "",
                "scope_description": "",
                "work_type": doc_type,
                "work_activities": [],
                "payment_termins": [],
                "termin_count": 1,
                "items": []
            }

            for key, default_value in defaults.items():
                if key not in data or data[key] is None:
                    data[key] = default_value

            # If deterministic items were extracted, use them with 100% precision
            if has_deterministic_items:
                data["items"] = deterministic_items
                logger.info(f"[Extraction] Injected {len(deterministic_items)} deterministic items directly (0 tokens wasted)")
            else:
                # Ensure items have required fields
                if "items" not in data or not data["items"]:
                    data["items"] = []
                else:
                    for item in data["items"]:
                        if "no" not in item:
                            item["no"] = ""
                        if "uraian" not in item:
                            item["uraian"] = ""
                        if "volume" not in item:
                            item["volume"] = ""
                        if "satuan" not in item:
                            item["satuan"] = ""

            # Add timeline default based on document type if empty
            if not data.get("timeline"):
                data["timeline"] = self._get_default_timeline(doc_type)

            # Fallback if work_activities wasn't generated
            if not data.get("work_activities"):
                logger.info("Generating fallback work activities...")
                data["work_activities"] = self.generate_work_activities(data, progress_callback=progress_callback)

            if ai_progress_callback:
                ai_progress_callback(95)  # Finalizing

            logger.info(f"Final extraction complete: {len(data.get('items', []))} items, {len(data.get('work_activities', []))} work activities")
            return data

        except Exception as e:
            logger.error(f"Failed to parse extraction: {e}")
            raise

    def _get_default_timeline(self, doc_type: str) -> str:
        """Get default timeline based on document type"""
        timelines = {
            "PENGADAAN": "3 bulan sejak PO terbit",
            "PEMELIHARAAN": "sesuai kontrak"
        }
        return timelines.get(doc_type, "sesuai kesepakatan")

    def generate_work_activities(self, extracted_data: Dict[str, Any], progress_callback=None) -> list:
        """Generate detailed work activities list based on extracted data"""
        doc_type = extracted_data.get('document_type', 'PENGADAAN')

        # Get doc-type-specific examples
        from strategies.factory import StrategyFactory
        strategy = StrategyFactory.create(doc_type)
        examples = strategy.get_work_activity_examples()

        prompt = f"""
You are an expert at writing Indonesian government procurement documents (RKS - Rencana Kerja & Syarat).

Generate a numbered list of detailed work activities (Pasal 2 format) for {doc_type} project.

## Project Data:
- Project: {extracted_data.get('project_name', '')}
- Work Type: {extracted_data.get('work_type', '')}
- Scope: {extracted_data.get('scope_description', '')}

## Items:
{self._format_items_for_prompt(extracted_data.get('items', []))}

## CRITICAL INSTRUCTIONS:

### Reference Examples for {doc_type}:
{examples}

### Requirements:
- Generate 2-6 activities following the pattern above
- Group related items into broader activities (NOT 1 activity per item)
- Follow appropriate phases for {doc_type}
- Include purpose/context in each activity
- Use specific locations when mentioned
- Return ONLY valid JSON array of strings

Generate work activities for this {doc_type} project:
"""

        try:
            result = self._call_gemini(prompt, stream=True, progress_callback=progress_callback)

            # Parse JSON from response
            import json
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()

            activities = json.loads(result)

            if not isinstance(activities, list):
                raise ValueError("Activities must be a list")

            logger.info(f"AI generated {len(activities)} work activities")
            for i, activity in enumerate(activities[:3], 1):
                logger.info(f"  {i}. {activity[:80]}...")

            return activities

        except Exception as e:
            logger.error(f"Failed to generate work activities: {e}")
            # Fallback: return basic activity
            return [f"Melakukan pekerjaan {extracted_data.get('work_type', 'tersebut')}"]

    def regenerate_pasal2(
        self,
        lhp_text: str,
        doc_type: str,
        custom_prompt: Optional[str] = None,
        jumlah_kegiatan: Optional[int] = None
    ) -> list:
        """Regenerate only work activities with optional custom prompt and jumlah override"""
        from strategies.factory import StrategyFactory

        strategy = StrategyFactory.create(doc_type)
        default_examples = strategy.get_work_activity_examples()

        # Build prompt
        prompt_parts = []

        if custom_prompt:
            prompt_parts.append(f"You are an expert at writing Indonesian government procurement documents (RKS).\n\nCustom user instruction:\n{custom_prompt}")
        else:
            prompt_parts.append(f"""You are an expert at writing Indonesian government procurement documents (RKS - Rencana Kerja & Syarat).

Generate a numbered list of detailed work activities (Pasal 2 format) for {doc_type} project.""")

        prompt_parts.append(f"""
## Reference Examples for {doc_type}:
{default_examples}

### CRITICAL INSTRUCTIONS:
- Follow the pattern above
- Group related items into broader activities
- Include purpose/context in each activity
- Use specific locations when mentioned
- Return ONLY valid JSON array of strings""")

        if jumlah_kegiatan:
            prompt_parts.append(f"\n- Generate exactly {jumlah_kegiatan} activities")
        else:
            prompt_parts.append(f"\n- Generate 2-6 activities")

        prompt_parts.append(f"\n## LHP Text:\n{lhp_text[:12000]}")

        prompt = "\n".join(prompt_parts)

        try:
            result = self._call_gemini(prompt, stream=False)

            # Parse JSON from response
            import json
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()

            activities = json.loads(result)

            if not isinstance(activities, list):
                raise ValueError("Activities must be a list")

            logger.info(f"Regenerated {len(activities)} work activities")
            return activities

        except Exception as e:
            logger.error(f"Failed to regenerate work activities: {e}")
            raise

    def _format_items_for_prompt(self, items: list) -> str:
        """Format items for prompt"""
        if not items:
            return "Tidak ada item"

        material_items = [i for i in items if i.get('category') == 'Material']
        jasa_items = [i for i in items if i.get('category') == 'Jasa']

        text = ""
        if material_items:
            text += "\nMaterial:\n"
            for item in material_items[:5]:
                text += f"- {item.get('name', '')} ({item.get('quantity', '')} {item.get('unit', '')})\n"

        if jasa_items:
            text += "\nJasa:\n"
            for item in jasa_items[:5]:
                text += f"- {item.get('name', '')} ({item.get('quantity', '')} {item.get('unit', '')})\n"

        return text
