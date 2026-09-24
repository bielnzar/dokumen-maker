import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # App settings
    APP_TITLE = "Generator Dokumen RAB/RKS"
    APP_VERSION = "1.0.0"

    # AI Settings
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    # OCR Settings
    OCR_USE_GPU = True
    OCR_LANGUAGES = ['id', 'en']

    # File paths
    TEMPLATES_DIR = "templates"
    EXTRACTED_DIR = "extracted"
    OUTPUT_DIR = "output"

    # Document types
    DOC_TYPES = ["PENGADAAN", "PEMELIHARAAN", "PADI_UMKM"]

    @classmethod
    def validate(cls):
        if not cls.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not found in environment")
