# tests/test_strategies/test_pemeliharaan_strategy.py
import pytest
from strategies.pemeliharaan_strategy import PemeliharaanStrategy

def test_pemeliharaan_payment_config_allows_termins():
    """PEMELIHARAAN should show termin inputs"""
    strategy = PemeliharaanStrategy()
    config = strategy.get_payment_config()

    assert config['show_termins'] is True
    assert config['allow_multiple'] is True
    assert config['fixed_payment'] is None

def test_pemeliharaan_format_work_activities_numbered():
    """Should format activities as numbered list"""
    strategy = PemeliharaanStrategy()
    activities = ["Perbaikan rutin", "Penggantian spare part"]

    result = strategy.format_work_activities(activities)

    assert "1. Perbaikan rutin" in result
    assert "2. Penggantian spare part" in result

def test_pemeliharaan_get_template_name():
    """Should return correct template names"""
    strategy = PemeliharaanStrategy()

    assert strategy.get_template_name("RAB") == "pengadaan"
    assert strategy.get_template_name("RKS") == "pemeliharaan"
