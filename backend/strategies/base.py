# strategies/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class DocumentStrategy(ABC):
    """Abstract base for document type strategies

    Stateless - data injected per method call for clarity and testability.
    Methods ordered by pasal structure for easier debugging.
    """

    # === PASAL 2: Work Activities ===
    @abstractmethod
    def format_work_activities(self, activities: List[str], data: Dict[str, Any] = None) -> str:
        """Format work activities for pasal_2

        Args:
            activities: List of work activities
            data: Optional extracted data for placeholder replacement (e.g., work_type)
        """
        pass

    @abstractmethod
    def get_work_activity_examples(self) -> str:
        """Return few-shot examples for AI extraction (Pasal 2)"""
        pass

    # === PASAL 10: Payment ===
    @abstractmethod
    def get_payment_config(self) -> Dict[str, Any]:
        """Return payment UI configuration for Pasal 10

        Returns:
            {
                'show_termins': bool,        # Show termin inputs in UI?
                'allow_multiple': bool,      # Allow add/delete termins?
                'fixed_payment': str or None # Fixed payment text or None
            }
        """
        pass

    @abstractmethod
    def format_payment_content(self, data: Dict[str, Any]) -> Optional[List[str]]:
        """Format pasal_10 payment content

        Returns list of termin strings (for Word auto-numbering) or None
        """
        pass

    # === DOCUMENT GENERATION ===
    @abstractmethod
    def get_template_name(self, doc_type: str) -> str:
        """Return template filename (without .docx)

        Args:
            doc_type: 'RAB' or 'RKS'

        Returns:
            Template name (e.g., 'RKS_pengadaan')
        """
        pass
