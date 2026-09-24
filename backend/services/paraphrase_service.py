import google.generativeai as genai
from typing import List
from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger("paraphrase_service")

class ParaphraseService:
    def __init__(self):
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(Config.GEMINI_MODEL)

    def paraphrase_section(self, original_text: str, section_type: str) -> List[str]:
        """Generate paraphrased versions of text"""

        prompt = f"""
Generate 3 alternative paraphrased versions of this Indonesian text for a {section_type} section.
Keep the same meaning but use different wording. Return as a numbered list.

Original text:
{original_text}

Provide 3 alternatives:
"""

        try:
            response = self.model.generate_content(prompt)
            result = response.text

            # Parse the numbered list
            options = []
            for line in result.split('\n'):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('-')):
                    # Remove the number/bullet
                    clean = line.lstrip('0123456789.-) ')
                    if clean:
                        options.append(clean)

            # Ensure we have at least the original
            if not options:
                options = [original_text]

            return options[:3]  # Max 3 options

        except Exception as e:
            logger.error(f"Paraphrase error: {e}")
            return [original_text]  # Fallback to original
