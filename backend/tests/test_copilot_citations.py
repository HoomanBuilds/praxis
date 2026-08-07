"""Copilot response grounding and workspace query behavior."""
from __future__ import annotations

from types import SimpleNamespace

from api.routes_copilot import (
    _direct_matches,
    _extractive_response,
    _workspace_response,
)


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


def test_direct_match_uses_the_subject_instead_of_generic_request_words(monkeypatch):
    obligations = [
        SimpleNamespace(
            id="kyc",
            identifier="ABC-OB-003",
            description="Complete KYC verification before account activation",
            source_text="The intermediary shall complete know your client verification.",
            functional_area="client_services",
            confidence=0.9,
        ),
        SimpleNamespace(
            id="other",
            identifier="ABC-OB-004",
            description="Submit an annual status report",
            source_text="The report shall be filed annually.",
            functional_area="compliance",
            confidence=0.95,
        ),
    ]
    monkeypatch.setattr("api.routes_copilot.crud.list_obligations", lambda session: obligations)

    matches = _direct_matches(None, "What evidence is required for KYC obligations?")

    assert [item.identifier for item in matches] == ["ABC-OB-003"]


def test_extractive_evidence_response_reports_missing_checklist(monkeypatch):
    obligation = SimpleNamespace(
        id="kyc",
        identifier="ABC-OB-003",
        description="Complete KYC verification before account activation",
        source_text="The intermediary shall complete KYC verification.",
        functional_area="client_services",
        status="pending_review",
    )
    monkeypatch.setattr("api.routes_copilot.crud.list_evidence_requirements", lambda session, **kwargs: [])
    monkeypatch.setattr("api.routes_copilot._citable", lambda session, item: {
        "obligation_id": item.id,
        "obligation_identifier": item.identifier,
        "circular_reference": "SEBI/TEST/1",
        "paragraph": "4",
        "functional_area": "client_services",
        "status": "pending_review",
        "quote": item.source_text,
    })

    response = _extractive_response(None, "What evidence is required for KYC?", [obligation])

    assert response["grounded"] is True
    assert response["sources"] == ["ABC-OB-003"]
    assert "No generated evidence checklist exists" in response["answer"]


def test_extractive_response_rejects_an_unrelated_question():
    response = _extractive_response(None, "What is the lunch menu?", [])

    assert response["grounded"] is False
    assert response["citations"] == []
    assert "could not find" in response["answer"]
