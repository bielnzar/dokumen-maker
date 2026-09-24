# tests/test_strategies/test_pengadaan_strategy.py
import pytest
from strategies.pengadaan_strategy import PengadaanStrategy

def test_pengadaan_payment_config_shows_termins():
    """PENGADAAN should show termin inputs and allow multiple"""
    strategy = PengadaanStrategy()
    config = strategy.get_payment_config()

    assert config['show_termins'] is True
    assert config['allow_multiple'] is True
    assert config['fixed_payment'] is None

def test_pengadaan_format_work_activities_numbered():
    """Should format activities as numbered list"""
    strategy = PengadaanStrategy()
    activities = ["Activity one", "Activity two"]

    result = strategy.format_work_activities(activities)

    assert "1. Activity one" in result
    assert "2. Activity two" in result

def test_pengadaan_format_payment_with_single_termin():
    """Should format single termin payment"""
    strategy = PengadaanStrategy()
    data = {
        'payment_terms': {
            'termin_1_percent': '100',
            'termin_1_condition': 'setelah serah terima'
        }
    }

    result = strategy.format_payment_content(data)

    assert result is not None
    assert any("Termin I" in line and "100%" in line for line in result)

def test_pengadaan_format_payment_with_multiple_termins():
    """Should format multiple termins with Roman numerals"""
    strategy = PengadaanStrategy()
    data = {
        'payment_terms': {
            'termin_1_percent': '95',
            'termin_1_condition': 'setelah BAST-I',
            'termin_2_percent': '5',
            'termin_2_condition': 'setelah masa pemeliharaan'
        }
    }

    result = strategy.format_payment_content(data)

    assert result is not None
    assert any("Termin I" in line and "95%" in line for line in result)
    assert any("Termin II" in line and "5%" in line for line in result)

def test_pengadaan_get_template_name():
    """Should return correct template names"""
    strategy = PengadaanStrategy()

    assert strategy.get_template_name("RAB") == "pengadaan"
    assert strategy.get_template_name("RKS") == "pengadaan"
