import pytest
from services.paraphrase_service import ParaphraseService

def test_paraphrase_payment_terms():
    service = ParaphraseService()
    original = "Pembayaran dilakukan dengan termin I 95% dan termin II 5%"

    options = service.paraphrase_section(original, "payment_terms")

    assert isinstance(options, list)
    assert len(options) > 0
    assert all(isinstance(opt, str) for opt in options)
