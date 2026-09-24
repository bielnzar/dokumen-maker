# strategies/factory.py
from typing import Dict
from .base import DocumentStrategy
from .pengadaan_strategy import PengadaanStrategy
from .padiumkm_strategy import PadiumkmStrategy
from .pemeliharaan_strategy import PemeliharaanStrategy
from .nodin_strategy import NodinStrategy

class StrategyFactory:
    """Factory for creating document strategies"""

    _strategies: Dict[str, DocumentStrategy] = {
        "PENGADAAN": PengadaanStrategy(),
        "PADI_UMKM": PadiumkmStrategy(),
        "PEMELIHARAAN": PemeliharaanStrategy(),
        "NODIN": NodinStrategy()
    }

    @staticmethod
    def create(doc_type: str) -> DocumentStrategy:
        """Get strategy instance for document type

        Args:
            doc_type: PENGADAAN, PADI_UMKM, or PEMELIHARAAN

        Returns:
            DocumentStrategy instance

        Raises:
            ValueError: If doc_type not supported
        """
        strategy = StrategyFactory._strategies.get(doc_type)

        if not strategy:
            supported = list(StrategyFactory._strategies.keys())
            raise ValueError(
                f"Unsupported document type: {doc_type}. "
                f"Supported: {supported}"
            )

        return strategy

    @staticmethod
    def get_supported_types() -> list:
        """Return list of supported document types"""
        return list(StrategyFactory._strategies.keys())
