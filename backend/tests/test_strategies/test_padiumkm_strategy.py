# tests/test_strategies/test_padiumkm_strategy.py
import pytest
from strategies.padiumkm_strategy import PadiumkmStrategy

def test_padiumkm_payment_config_hides_termins():
    """PADIUMKM should hide termin inputs and show fixed payment"""
    strategy = PadiumkmStrategy()
    config = strategy.get_payment_config()

    assert config['show_termins'] is False
    assert config['allow_multiple'] is False
    assert config['fixed_payment'] == '100% via padiumkm.id'

def test_padiumkm_format_payment_returns_none():
    """Should return None to use template hardcoded payment"""
    strategy = PadiumkmStrategy()
    result = strategy.format_payment_content({})

    assert result is None

def test_padiumkm_format_work_activities_fixed_two():
    """Should always return 2 fixed activities"""
    strategy = PadiumkmStrategy()

    # Empty activities
    result = strategy.format_work_activities([])
    assert "Melakukan pengadaan dan uji fungsi" in result
    assert "Melakukan dukungan klaim garansi" in result

    # With activities (should ignore them)
    result = strategy.format_work_activities(["Custom activity"])
    assert "Melakukan pengadaan dan uji fungsi" in result
    assert "Custom activity" not in result

def test_padiumkm_get_template_name():
    """RAB shares pengadaan template, RKS uses unique template"""
    strategy = PadiumkmStrategy()

    assert strategy.get_template_name("RAB") == "pengadaan"
    assert strategy.get_template_name("RKS") == "padiumkm"
