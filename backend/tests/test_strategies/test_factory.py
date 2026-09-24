# tests/test_strategies/test_factory.py
import pytest
from strategies.factory import StrategyFactory
from strategies.pengadaan_strategy import PengadaanStrategy
from strategies.padiumkm_strategy import PadiumkmStrategy
from strategies.pemeliharaan_strategy import PemeliharaanStrategy
from strategies.base import DocumentStrategy

def test_factory_returns_pengadaan_strategy():
    """Factory should return PengadaanStrategy for PENGADAAN"""
    strategy = StrategyFactory.create("PENGADAAN")

    assert isinstance(strategy, PengadaanStrategy)

def test_factory_returns_padiumkm_strategy():
    """Factory should return PadiumkmStrategy for PADI_UMKM"""
    strategy = StrategyFactory.create("PADI_UMKM")

    assert isinstance(strategy, PadiumkmStrategy)

def test_factory_returns_pemeliharaan_strategy():
    """Factory should return PemeliharaanStrategy for PEMELIHARAAN"""
    strategy = StrategyFactory.create("PEMELIHARAAN")

    assert isinstance(strategy, PemeliharaanStrategy)

def test_factory_raises_error_for_unsupported_type():
    """Factory should raise ValueError for unsupported types"""
    with pytest.raises(ValueError, match="Unsupported document type"):
        StrategyFactory.create("LISENSI")

def test_factory_returns_supported_types():
    """Factory should list all supported types"""
    types = StrategyFactory.get_supported_types()

    assert "PENGADAAN" in types
    assert "PADI_UMKM" in types
    assert "PEMELIHARAAN" in types
    assert "NODIN" in types
    assert len(types) == 4

def test_factory_returns_same_instance():
    """Factory should return singleton instances"""
    strategy1 = StrategyFactory.create("PENGADAAN")
    strategy2 = StrategyFactory.create("PENGADAAN")

    assert strategy1 is strategy2
