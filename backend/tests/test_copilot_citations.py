"""Copilot citation grounding (§Part K).

The copilot must never surface a citation the model invented. Citations are checked
against the obligations that were actually placed in context, and the reference and
paragraph are re-read from the database rather than trusted from the model output.
"""
from __future__ import annotations

from types import SimpleNamespace

from api.routes_copilot import Citation, CopilotAnswer, _verify_citations, _workspace_response


CITABLE = {
    "ABC-OB-001": {
        "obligation_id": "id1",
        "obligation_identifier": "ABC-OB-001",
        "circular_reference": "SEBI/HO/MIRSD/2026/1",
        "paragraph": "4.2",
        "functional_area": "compliance",
        "status": "approved",
        "quote": "The intermediary shall file the return.",
    },
    "ABC-OB-002": {
        "obligation_id": "id2",
        "obligation_identifier": "ABC-OB-002",
        "circular_reference": "SEBI/HO/MIRSD/2026/1",
        "paragraph": "5",
        "functional_area": "technology",
        "status": "pending_review",
        "quote": "The intermediary shall maintain access controls.",
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


def test_quote_is_read_from_database_context():
    raw = [Citation(obligation_identifier="ABC-OB-001", quote="x" * 500)]
    assert _verify_citations(raw, CITABLE)[0]["quote"] == "The intermediary shall file the return."


def test_answer_schema_requires_grounded_and_confidence():
    """The schema is the contract - a model omitting these cannot validate."""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        CopilotAnswer(answer="hello")  # missing grounded + confidence

    ok = CopilotAnswer(answer="hello", grounded=False, confidence=0.4)
    assert ok.citations == []

    with pytest.raises(ValidationError):
        CopilotAnswer(answer="x", grounded=True, confidence=1.7)  # out of range


def test_greeting_is_answered_without_querying_the_model():
    response = _workspace_response(None, "hi")
    assert response is not None
    assert response["response_type"] == "greeting"
    assert response["answer"].startswith("Hello.")


def test_pending_review_query_uses_workspace_records(monkeypatch):
    obligations = [
        SimpleNamespace(
            id="id1",
            identifier="ABC-OB-001",
            description="Maintain a compliance register",
            source_text="The intermediary shall maintain a compliance register.",
            document_id=None,
            source_paragraph_ref="4.2",
            functional_area="compliance",
            status="pending_review",
        )
    ]
    monkeypatch.setattr("api.routes_copilot.crud.list_obligations", lambda session, **kwargs: obligations)
    response = _workspace_response(None, "Find obligations that need review")
    assert response is not None
    assert response["response_type"] == "obligation_list"
    assert response["sources"] == ["ABC-OB-001"]
    assert "1 pending-review obligations" in response["answer"]


def test_urgent_risk_query_returns_actionable_workspace_priorities(monkeypatch):
    obligations = [
        SimpleNamespace(
            id="id1",
            identifier="ABC-OB-001",
            description="Submit the annual compliance return",
            source_text="The intermediary shall submit the annual compliance return.",
            document_id=None,
            source_paragraph_ref="4.2",
            functional_area="compliance",
            status="pending_review",
            deadline_hint="2026-08-09",
            confidence=0.85,
        ),
        SimpleNamespace(
            id="id2",
            identifier="ABC-OB-002",
            description="Maintain access control records",
            source_text="The intermediary shall maintain access control records.",
            document_id=None,
            source_paragraph_ref="5",
            functional_area="technology",
            status="pending_review",
            deadline_hint=None,
            confidence=0.72,
        ),
    ]
    tasks = []
    monkeypatch.setattr("api.routes_copilot.crud.list_obligations", lambda session, **kwargs: obligations)
    monkeypatch.setattr("api.routes_copilot.crud.list_tasks", lambda session, **kwargs: tasks)

    response = _workspace_response(None, "What are the most urgent compliance risks and what should I do first?")

    assert response is not None
    assert response["response_type"] == "priority_summary"
    assert response["sources"][0] == "ABC-OB-001"
    assert "2 obligations are pending review" in response["answer"]
    assert "Review obligations with the earliest recorded dates" in response["answer"]
