from agents.obligation_extraction import (
    _calibrate_confidence,
    _dedupe,
    _refine_area,
)
from schemas import FunctionalArea, Obligation


def _ob(desc: str, conf: float) -> Obligation:
    return Obligation(identifier="x", document_id="d", description=desc, source_text=desc, confidence=conf)


def test_confidence_never_claims_full_certainty():
    c = _calibrate_confidence(1.0, "The broker shall do X.", quote_matched=True, area=FunctionalArea.OPERATIONS)
    assert c <= 0.98


def test_confidence_penalised_for_unmatched_quote():
    matched = _calibrate_confidence(0.95, "The broker shall do X.", True, FunctionalArea.OPERATIONS)
    unmatched = _calibrate_confidence(0.95, "The broker shall do X.", False, FunctionalArea.OPERATIONS)
    assert unmatched < matched


def test_confidence_penalised_without_mandatory_verb():
    with_verb = _calibrate_confidence(0.9, "The broker shall report incidents.", True, FunctionalArea.TECHNOLOGY)
    without_verb = _calibrate_confidence(0.9, "Incidents are reported promptly.", True, FunctionalArea.TECHNOLOGY)
    assert without_verb < with_verb


def test_refine_area_corrects_high_signal_terms():
    assert _refine_area(FunctionalArea.CLIENT_SERVICES, "creation of a margin pledge") == FunctionalArea.OPERATIONS
    assert _refine_area(FunctionalArea.COMPLIANCE, "conduct VAPT of critical systems") == FunctionalArea.TECHNOLOGY
    # a non-signal text is left untouched
    assert _refine_area(FunctionalArea.LEGAL, "enter into an agreement") == FunctionalArea.LEGAL


def test_dedupe_removes_near_identical_and_keeps_higher_confidence():
    obs = [
        _ob("Maintain records of client authorisations for margin pledge", 0.7),
        _ob("Keep records of the client authorisation for the margin pledge", 0.9),
        _ob("Upgrade back-office systems within sixty days", 0.95),
    ]
    kept = _dedupe(obs)
    assert len(kept) == 2  # the two near-identical record-keeping duties collapse to one
    record_keepers = [o for o in kept if "record" in o.description.lower()]
    assert len(record_keepers) == 1
    assert record_keepers[0].confidence == 0.9  # the stronger instance is retained
