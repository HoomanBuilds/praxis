"""Copilot response grounding and workspace query behavior."""
from __future__ import annotations

from types import SimpleNamespace

from api.routes_copilot import (
    CopilotAnswer,
    CopilotRequest,
    _direct_matches,
    _needs_workspace_context,
    _workspace_response,
    copilot,
)


def test_product_questions_are_answered_without_regulatory_search(monkeypatch):
    monkeypatch.setattr(
        "api.routes_copilot.crud.list_obligations",
        lambda session, **kwargs: (_ for _ in ()).throw(
            AssertionError("product help must not search obligations")
        ),
    )

    examples = {
        "what is obligations?": "specific requirements Praxis identifies",
        "what is compliance map here?": "relationship view",
        "what is command centre we have?": "live summary",
        "what is evidence centre?": "proof required for compliance",
        "what is regulations?": "source documents in Praxis",
    }

    for question, expected in examples.items():
        response = _workspace_response(None, question)
        assert response is not None
        assert response["response_type"] == "product_help"
        assert expected in response["answer"]
        assert response["citations"] == []


def test_whole_workspace_overview_reports_real_gaps(monkeypatch):
    monkeypatch.setattr("api.routes_copilot.crud.list_documents", lambda session: [SimpleNamespace()])
    monkeypatch.setattr(
        "api.routes_copilot.crud.list_obligations",
        lambda session, **kwargs: [SimpleNamespace(status="pending_review") for _ in range(3)],
    )
    monkeypatch.setattr("api.routes_copilot.crud.list_tasks", lambda session, **kwargs: [])
    monkeypatch.setattr(
        "api.routes_copilot.crud.list_evidence_requirements",
        lambda session, **kwargs: [],
    )
    monkeypatch.setattr("api.routes_copilot.crud.list_filings", lambda session, **kwargs: [])

    response = _workspace_response(
        None,
        "okay give me whole overview where we are what we have what not what is status of us",
    )

    assert response is not None
    assert response["response_type"] == "workspace_summary"
    assert "3 obligations are recorded" in response["answer"]
    assert "3 obligations still need human review" in response["answer"]
    assert "no operational tasks have been generated yet" in response["answer"]


def test_greeting_is_answered_without_querying_the_model():
    response = _workspace_response(None, "hi")
    assert response is not None
    assert response["response_type"] == "greeting"
    assert response["answer"].startswith("Hello.")


def test_identity_question_is_not_treated_as_workspace_search():
    response = _workspace_response(None, "who are you?")

    assert response is not None
    assert response["response_type"] == "greeting"
    assert response["citations"] == []
    assert "Praxis Copilot" in response["answer"]


def test_ambiguous_one_word_follow_up_asks_for_clarification():
    response = _workspace_response(None, "what?")

    assert response is not None
    assert response["citations"] == []
    assert "which part" in response["answer"]


def test_general_sebi_question_does_not_request_workspace_context():
    assert _needs_workspace_context("What do you know about SEBI?") is False
    assert _needs_workspace_context("What compliance obligations mention KYC?") is True


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


def test_compliance_status_reports_only_active_priorities(monkeypatch):
    obligations = [SimpleNamespace(status="pending_review", functional_area="compliance")]
    monkeypatch.setattr("api.routes_copilot.crud.list_obligations", lambda session, **kwargs: obligations)
    monkeypatch.setattr("api.routes_copilot.crud.list_tasks", lambda session, **kwargs: [])

    response = _workspace_response(None, "summarize compliance status")

    assert response is not None
    assert response["response_type"] == "workspace_summary"
    assert "Priority: clear the pending obligation review queue." in response["answer"]
    assert "resolve overdue work" not in response["answer"]
    assert "assign unowned tasks" not in response["answer"]


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

    review_response = _workspace_response(None, "review obligations")
    assert review_response is not None
    assert review_response["response_type"] == "priority_summary"
    assert "2 obligations are pending review" in review_response["answer"]


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


def test_follow_up_uses_full_history_without_repeating_keyword_results(monkeypatch):
    captured = {}

    def complete(system_prompt, history, user_prompt, schema, retries):
        captured["history"] = history
        captured["prompt"] = user_prompt
        return SimpleNamespace(parsed=CopilotAnswer(
            answer="I was describing the current compliance review queue.",
            source_ids=[],
            grounded=False,
            confidence=0.8,
        ))

    monkeypatch.setattr("llm.copilot_structured_complete", complete)
    payload = CopilotRequest(
        question="Can you clarify that?",
        history=[
            {"role": "user", "content": "Summarize compliance status"},
            {"role": "assistant", "content": "There are 12 obligations pending review."},
        ],
    )

    response = copilot.__wrapped__(SimpleNamespace(), payload, None)

    assert response["answer"].startswith("I was describing")
    assert captured["history"] == [
        {"role": "user", "content": "Summarize compliance status"},
        {"role": "assistant", "content": "There are 12 obligations pending review."},
    ]
    assert "OBLIGATION" not in captured["prompt"]


def test_model_sources_are_verified_against_workspace_context(monkeypatch):
    obligation = SimpleNamespace(
        id="kyc",
        identifier="ABC-OB-003",
        description="Complete KYC verification before account activation",
        source_text="The intermediary shall complete KYC verification.",
        document_id=None,
        source_paragraph_ref="4",
        functional_area="client_services",
        status="pending_review",
        deadline_hint=None,
        confidence=0.9,
    )
    monkeypatch.setattr("api.routes_copilot.crud.list_obligations", lambda session: [obligation])
    monkeypatch.setattr("api.routes_copilot.crud.list_rules", lambda session, **kwargs: [])
    monkeypatch.setattr("api.routes_copilot.crud.list_tasks", lambda session, **kwargs: [])
    monkeypatch.setattr("api.routes_copilot.crud.list_evidence_requirements", lambda session, **kwargs: [])
    monkeypatch.setattr("llm.copilot_structured_complete", lambda *args, **kwargs: SimpleNamespace(
        parsed=CopilotAnswer(
            answer="KYC must be completed before account activation.",
            source_ids=["ABC-OB-003", "MADE-UP-OB-999"],
            grounded=True,
            confidence=1.0,
        )
    ))

    response = copilot.__wrapped__(
        SimpleNamespace(),
        CopilotRequest(question="What is required for KYC obligations?"),
        None,
    )

    assert response["sources"] == ["ABC-OB-003"]
    assert response["grounded"] is True
    assert response["confidence"] == 0.95


def test_standalone_workspace_question_drops_unrelated_history(monkeypatch):
    captured = {}
    obligation = SimpleNamespace(
        id="kyc",
        identifier="ABC-OB-003",
        description="Complete KYC verification before account activation",
        source_text="The intermediary shall complete KYC verification.",
        document_id=None,
        source_paragraph_ref="4",
        functional_area="client_services",
        status="pending_review",
        deadline_hint=None,
        confidence=0.9,
    )
    monkeypatch.setattr("api.routes_copilot.crud.list_obligations", lambda session: [obligation])
    monkeypatch.setattr("api.routes_copilot.crud.list_rules", lambda session, **kwargs: [])
    monkeypatch.setattr("api.routes_copilot.crud.list_tasks", lambda session, **kwargs: [])
    monkeypatch.setattr("api.routes_copilot.crud.list_evidence_requirements", lambda session, **kwargs: [])

    def complete(_system, history, prompt, _schema, retries):
        captured["history"] = history
        captured["prompt"] = prompt
        return SimpleNamespace(parsed=CopilotAnswer(
            answer="KYC verification is required before account activation.",
            source_ids=["ABC-OB-003"],
            grounded=True,
            confidence=0.9,
        ))

    monkeypatch.setattr("llm.copilot_structured_complete", complete)
    payload = CopilotRequest(
        question="Explain the KYC obligation and its operational impact",
        history=[
            {"role": "user", "content": "Review obligations"},
            {"role": "assistant", "content": "Start with the pending review queue."},
        ],
    )

    response = copilot.__wrapped__(SimpleNamespace(), payload, None)

    assert response["grounded"] is True
    assert captured["history"] == []
    assert "Use only the workspace context" in captured["prompt"]


def test_ungrounded_workspace_answer_is_replaced_with_verified_context(monkeypatch):
    obligation = SimpleNamespace(
        id="kyc",
        identifier="ABC-OB-003",
        description="Do not seek KYC documents from the surviving joint holder except a death certificate.",
        source_text="No KYC documents shall be sought except a copy of the death certificate.",
        document_id=None,
        source_paragraph_ref="4",
        functional_area="client_services",
        status="pending_review",
        deadline_hint=None,
        confidence=0.9,
    )
    monkeypatch.setattr("api.routes_copilot.crud.list_obligations", lambda session: [obligation])
    monkeypatch.setattr("api.routes_copilot.crud.list_rules", lambda session, **kwargs: [])
    monkeypatch.setattr("api.routes_copilot.crud.list_tasks", lambda session, **kwargs: [])
    monkeypatch.setattr("api.routes_copilot.crud.list_evidence_requirements", lambda session, **kwargs: [])
    monkeypatch.setattr("llm.copilot_structured_complete", lambda *args, **kwargs: SimpleNamespace(
        parsed=CopilotAnswer(
            answer="Submit a PAN card and address proof.",
            source_ids=[],
            grounded=False,
            confidence=0.0,
        )
    ))

    response = copilot.__wrapped__(
        SimpleNamespace(),
        CopilotRequest(question="What does the KYC obligation require operationally?"),
        None,
    )

    assert "could not verify a complete answer" in response["answer"]
    assert "PAN card" not in response["answer"]
    assert response["sources"] == ["ABC-OB-003"]
    assert response["grounded"] is True


def test_evidence_question_uses_structured_workspace_data_without_model(monkeypatch):
    obligation = SimpleNamespace(
        id="kyc",
        identifier="ABC-OB-003",
        description="Complete KYC verification before account activation",
        source_text="The intermediary shall complete KYC verification.",
        document_id=None,
        source_paragraph_ref="4",
        functional_area="client_services",
        status="pending_review",
        deadline_hint=None,
        confidence=0.9,
    )
    requirement = SimpleNamespace(
        document_type="KYC verification record",
        required_content="Identity and address checks with verification status.",
        collector="Client onboarding",
    )
    monkeypatch.setattr("api.routes_copilot.crud.list_obligations", lambda session: [obligation])
    monkeypatch.setattr(
        "api.routes_copilot.crud.list_evidence_requirements",
        lambda session, **kwargs: [requirement],
    )
    monkeypatch.setattr(
        "llm.copilot_structured_complete",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("model should not run")),
    )

    response = copilot.__wrapped__(
        SimpleNamespace(),
        CopilotRequest(question="What evidence is required for KYC obligations?"),
        None,
    )

    assert "KYC verification record" in response["answer"]
    assert "Client onboarding" in response["answer"]
    assert response["sources"] == ["ABC-OB-003"]
    assert response["grounded"] is True


def test_general_question_uses_model_without_workspace_citations(monkeypatch):
    monkeypatch.setattr("api.routes_copilot.crud.list_obligations", lambda session: (_ for _ in ()).throw(
        AssertionError("general questions must not search obligations")
    ))
    monkeypatch.setattr("llm.copilot_structured_complete", lambda *args, **kwargs: SimpleNamespace(
        parsed=CopilotAnswer(
            answer="Securities regulators protect investors through disclosure and enforcement.",
            source_ids=[],
            grounded=False,
            confidence=0.95,
        ),
        provider="0g",
        model="qwen3.8-max",
    ))

    response = copilot.__wrapped__(
        SimpleNamespace(),
        CopilotRequest(question="How do securities regulators protect retail investors?"),
        None,
    )

    assert response["answer"].startswith("Securities regulators protect")
    assert response["citations"] == []
    assert response["grounded"] is False
    assert response["analysis_provider"] == "0g"
    assert response["analysis_model"] == "qwen3.8-max"
