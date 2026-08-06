"""Copilot citation grounding (§Part K).

The copilot must never surface a citation the model invented. Citations are checked
against the obligations that were actually placed in context, and the reference and
paragraph are re-read from the database rather than trusted from the model output.
"""
from __future__ import annotations

from api.routes_copilot import Citation, CopilotAnswer, _verify_citations


CITABLE = {
    "ABC-OB-001": {
        "obligation_id": "id1",
        "obligation_identifier": "ABC-OB-001",
        "circular_reference": "SEBI/HO/MIRSD/2026/1",
        "paragraph": "4.2",
        "functional_area": "compliance",
        "status": "approved",
    },
    "ABC-OB-002": {
        "obligation_id": "id2",
        "obligation_identifier": "ABC-OB-002",
        "circular_reference": "SEBI/HO/MIRSD/2026/1",
        "paragraph": "5",
        "functional_area": "technology",
        "status": "pending_review",
    },
}


def test_hallucinated_identifier_is_dropped():
    raw = [
        Citation(obligation_identifier="ABC-OB-001", quote="shall file"),
        Citation(obligation_identifier="XYZ-OB-999", quote="invented"),
    ]
    out = _verify_citations(raw, CITABLE)
    assert [c["obligation_identifier"] for c in out] == ["ABC-OB-001"]


def test_model_supplied_reference_is_overwritten_from_db():
    """A model claiming the wrong circular must not be able to misattribute a source."""
    raw = [Citation(
        obligation_identifier="ABC-OB-002",
        circular_reference="SEBI/FAKE/9999",
        paragraph="99",
        quote="q",
    )]
    out = _verify_citations(raw, CITABLE)
    assert out[0]["circular_reference"] == "SEBI/HO/MIRSD/2026/1"
    assert out[0]["paragraph"] == "5"


def test_duplicate_citations_are_collapsed():
    raw = [
        Citation(obligation_identifier="ABC-OB-001"),
        Citation(obligation_identifier="ABC-OB-001"),
    ]
    assert len(_verify_citations(raw, CITABLE)) == 1


def test_empty_context_means_nothing_is_citable():
    raw = [Citation(obligation_identifier="ABC-OB-001")]
    assert _verify_citations(raw, {}) == []


def test_quote_is_truncated():
    raw = [Citation(obligation_identifier="ABC-OB-001", quote="x" * 500)]
    assert len(_verify_citations(raw, CITABLE)[0]["quote"]) == 300


def test_answer_schema_requires_grounded_and_confidence():
    """The schema is the contract — a model omitting these cannot validate."""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        CopilotAnswer(answer="hello")  # missing grounded + confidence

    ok = CopilotAnswer(answer="hello", grounded=False, confidence=0.4)
    assert ok.citations == []

    with pytest.raises(ValidationError):
        CopilotAnswer(answer="x", grounded=True, confidence=1.7)  # out of range
