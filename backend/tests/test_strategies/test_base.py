# tests/test_strategies/test_base.py
import pytest
from strategies.base import DocumentStrategy

def test_document_strategy_cannot_be_instantiated():
    """Abstract base class should not be directly instantiable"""
    with pytest.raises(TypeError):
        DocumentStrategy()

def test_document_strategy_requires_abstract_methods():
    """Abstract base class should require all abstract methods to be implemented"""
    class IncompleteStrategy(DocumentStrategy):
        pass

    # Should raise TypeError when trying to instantiate incomplete strategy
    with pytest.raises(TypeError, match="abstract"):
        IncompleteStrategy()
