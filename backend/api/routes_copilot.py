"""Grounded Copilot responses built from the current compliance workspace."""
from __future__ import annotations

import re
from collections import Counter
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.rate_limit import limiter
from db import crud, models
from db.session import get_db

router = APIRouter(prefix="/api", tags=["copilot"])


class CopilotTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=2000)


class CopilotRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)
    document_id: str | None = None
    obligation_id: str | None = None
    history: list[CopilotTurn] = Field(default_factory=list, max_length=6)


def _citable(session: Session, ob: models.Obligation) -> dict:
    """Server-side truth for one citable obligation - never taken from the model."""
    doc = crud.get_document(session, ob.document_id) if ob.document_id else None
    return {
        "obligation_id": ob.id,
        "obligation_identifier": ob.identifier,
        "circular_reference": (doc.reference if doc else "") or "",
        "paragraph": ob.source_paragraph_ref or "",
        "functional_area": ob.functional_area,
        "status": ob.status,
        "quote": (ob.source_text or ob.description)[:300],
    }


_GREETING_RE = re.compile(r"^(?:hi|hello|hey)(?:\s+(?:there|praxis))?[!,.?\s]*$", re.IGNORECASE)

_QUERY_STOPWORDS = {
    "about", "all", "and", "any", "are", "compliance", "deadline", "do", "document",
    "documents", "does", "due", "evidence", "explain", "find", "for", "from", "give",
    "how", "in", "is", "its", "me", "most", "obligation", "obligations", "of", "on",
    "owner", "report", "reporting", "reports", "responsible",
    "required", "requirement", "requirements", "regulation", "regulatory", "show",
    "status", "task", "tasks", "tell", "that", "the", "this", "timeline", "to", "what",
    "when", "where", "which", "who", "why", "workspace",
}


def _query_terms(question: str) -> list[str]:
    return [
        token
        for token in re.findall(r"[a-z0-9]+", question.lower())
        if len(token) >= 3 and token not in _QUERY_STOPWORDS
    ]


def _term_matches(term: str, text: str) -> bool:
    if term == "kyc":
        return "kyc" in text or "know your client" in text or "know your customer" in text
    if term in {"cyber", "cybersecurity"}:
        return "cyber" in text
    singular = term[:-1] if term.endswith("s") and len(term) > 4 else term
    return term in text or singular in text


def _direct_matches(
    session: Session,
    question: str,
    scope: list[models.Obligation] | None = None,
) -> list[models.Obligation]:
    terms = _query_terms(question)
    if not terms:
        return []
    obligations = scope if scope is not None else crud.list_obligations(session)
    ranked: list[tuple[int, float, models.Obligation]] = []
    for obligation in obligations:
        text = " ".join([
            obligation.identifier or "",
            obligation.description or "",
            obligation.source_text or "",
            obligation.functional_area or "",
        ]).lower()
        matches = sum(_term_matches(term, text) for term in terms)
        if matches:
            ranked.append((matches, obligation.confidence, obligation))
    ranked.sort(key=lambda item: (-item[0], -item[1], item[2].identifier))
    return [item[2] for item in ranked[:5]]


def _extractive_response(
    session: Session,
    question: str,
    obligations: list[models.Obligation],
) -> dict:
    if not obligations:
        return {
            "answer": (
                "I could not find a workspace obligation that directly matches this question. "
                "Try a regulatory topic, circular reference, functional area, or obligation ID."
            ),
            "citations": [],
            "sources": [],
            "grounded": False,
            "confidence": 1.0,
            "response_type": "obligation_list",
        }

    normalized = question.lower()
    evidence_query = "evidence" in normalized or "document" in normalized
    deadline_query = "deadline" in normalized or "due" in normalized or "timeline" in normalized
    owner_query = "owner" in normalized or "responsible" in normalized
    lines = [f"I found {len(obligations)} directly matching workspace records.", ""]
    generated_evidence = False
    for obligation in obligations:
        detail = obligation.description[:260]
        if evidence_query:
            requirements = crud.list_evidence_requirements(session, obligation_id=obligation.id)
            if requirements:
                generated_evidence = True
                evidence = "; ".join(
                    f"{item.document_type}: {item.required_content}" for item in requirements[:3]
                )
                detail = f"{detail} Evidence checklist: {evidence}"
            else:
                detail = f"{detail} Evidence checklist: not generated."
        elif deadline_query:
            detail = f"{detail} Recorded timing: {obligation.deadline_hint or 'no exact date recorded'}."
        elif owner_query:
            tasks = crud.list_tasks(session, obligation_id=obligation.id)
            owners = sorted({task.primary_owner for task in tasks if task.primary_owner})
            detail = f"{detail} Owners: {', '.join(owners) if owners else 'not assigned yet'}."
        area = obligation.functional_area.replace("_", " ")
        status = obligation.status.replace("_", " ")
        lines.append(f"- {obligation.identifier} [{area}, {status}]: {detail}")

    if evidence_query and not generated_evidence:
        lines.extend([
            "",
            "No generated evidence checklist exists for these records yet. Review and approve "
            "an obligation before creating its operational evidence requirements.",
        ])

    citations = [
        {**_citable(session, obligation), "quote": (obligation.source_text or obligation.description)[:300]}
        for obligation in obligations
    ]
    return {
        "answer": "\n".join(lines),
        "citations": citations,
        "sources": [item["obligation_identifier"] for item in citations],
        "grounded": True,
        "confidence": 1.0,
        "response_type": "obligation_list",
    }


def _iso_deadline(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _priority_response(session: Session) -> dict:
    obligations = crud.list_obligations(session)
    tasks = crud.list_tasks(session)
    today = date.today()
    overdue_tasks = [
        task for task in tasks
        if task.deadline and task.deadline < today and task.status != "completed"
    ]
    pending = [ob for ob in obligations if ob.status == "pending_review"]
    dated = [
        (deadline, ob)
        for ob in obligations
        if (deadline := _iso_deadline(ob.deadline_hint)) is not None
    ]
    dated.sort(key=lambda item: item[0])

    obligation_by_id = {ob.id: ob for ob in obligations}
    priority: list[models.Obligation] = []
    seen: set[str] = set()
    for task in sorted(overdue_tasks, key=lambda item: item.deadline or today):
        ob = obligation_by_id.get(task.obligation_id)
        if ob and ob.id not in seen:
            priority.append(ob)
            seen.add(ob.id)
    for _, ob in dated:
        if ob.status == "pending_review" and ob.id not in seen:
            priority.append(ob)
            seen.add(ob.id)
    for ob in sorted(pending, key=lambda item: item.confidence):
        if ob.id not in seen:
            priority.append(ob)
            seen.add(ob.id)
    selected = priority[:5]

    citations = [
        {**_citable(session, ob), "quote": (ob.source_text or ob.description)[:300]}
        for ob in selected
    ]
    actions: list[str] = []
    if overdue_tasks:
        actions.append("Resolve overdue tasks and confirm their evidence.")
    if dated:
        actions.append("Review obligations with the earliest recorded dates.")
    if pending:
        actions.append("Approve confirmed obligations so operational tasks can be created.")
    if tasks and any(not task.primary_owner for task in tasks):
        actions.append("Assign owners to every unowned task.")

    lines = [
        "The immediate priority is review triage based on current workspace records.",
        "",
        f"- {len(overdue_tasks)} incomplete tasks are overdue.",
        f"- {len(pending)} obligations are pending review.",
        f"- {len(dated)} obligations have a specific calendar date recorded.",
        f"- {sum(not task.primary_owner for task in tasks)} tasks have no owner.",
        "",
        "Recommended order:",
    ]
    lines.extend(f"{index}. {action}" for index, action in enumerate(actions, start=1))
    if selected:
        lines.extend(["", "Start with:"])
        for ob in selected:
            deadline = f" due {ob.deadline_hint}" if _iso_deadline(ob.deadline_hint) else ""
            lines.append(f"- {ob.identifier}{deadline}: {ob.description[:180]}")
    return {
        "answer": "\n".join(lines),
        "citations": citations,
        "sources": [item["obligation_identifier"] for item in citations],
        "grounded": True,
        "confidence": 1.0,
        "response_type": "priority_summary",
    }


def _workspace_response(session: Session, question: str) -> dict | None:
    normalized = " ".join(question.lower().split()).strip(" !,.?")
    if _GREETING_RE.fullmatch(question.strip()):
        return {
            "answer": (
                "Hello. I can help you review obligations, summarize compliance status, "
                "find ownership gaps, and trace answers to source records."
            ),
            "citations": [],
            "sources": [],
            "grounded": False,
            "confidence": 1.0,
            "response_type": "greeting",
        }

    priority_query = (
        "urgent" in normalized
        or "highest risk" in normalized
        or "what should i do first" in normalized
        or "prioritize" in normalized
        or "prioritise" in normalized
        or ("risk" in normalized and ("top" in normalized or "most" in normalized or "first" in normalized))
    )
    if priority_query:
        return _priority_response(session)

    obligations = None
    if "technology obligation" in normalized or "cyber obligation" in normalized:
        obligations = crud.list_obligations(session, functional_area="technology")
        heading = "technology"
    elif "obligation" in normalized and ("need review" in normalized or "pending review" in normalized):
        obligations = crud.list_obligations(session, status="pending_review")
        heading = "pending-review"

    if obligations is not None:
        selected = obligations[:8]
        citations = [
            {**_citable(session, ob), "quote": (ob.source_text or ob.description)[:300]}
            for ob in selected
        ]
        if selected:
            lines = [f"- {ob.identifier}: {ob.description}" for ob in selected]
            remainder = len(obligations) - len(selected)
            suffix = f"\n\n{remainder} more are available in Obligations." if remainder else ""
            answer = f"I found {len(obligations)} {heading} obligations.\n\n" + "\n".join(lines) + suffix
        else:
            answer = f"No {heading} obligations are currently recorded in this workspace."
        return {
            "answer": answer,
            "citations": citations,
            "sources": [item["obligation_identifier"] for item in citations],
            "grounded": bool(citations),
            "confidence": 1.0,
            "response_type": "obligation_list",
        }

    posture_query = (
        "overall compliance posture" in normalized
        or "board-level compliance summary" in normalized
    )
    area_query = "departments carry the most obligations" in normalized
    recent_query = "platform processed recently" in normalized
    if not (posture_query or area_query or recent_query):
        return None

    if recent_query:
        documents = crud.list_documents(session)
        lines = [f"- {doc.title or doc.reference} ({doc.status})" for doc in documents[:5]]
        answer = (
            f"The workspace contains {len(documents)} processed regulations. Most recent:\n\n"
            + ("\n".join(lines) if lines else "No regulations have been processed yet.")
        )
    else:
        all_obligations = crud.list_obligations(session)
        by_status = Counter(ob.status for ob in all_obligations)
        by_area = Counter(ob.functional_area for ob in all_obligations)
        if area_query:
            leaders = by_area.most_common(5)
            answer = "Largest compliance areas by obligation count:\n\n" + (
                "\n".join(f"- {area.replace('_', ' ').title()}: {count}" for area, count in leaders)
                if leaders else "No obligations have been classified yet."
            )
        else:
            approved = by_status.get("approved", 0) + by_status.get("edited", 0)
            pending = by_status.get("pending_review", 0)
            answer = (
                f"Current compliance posture: {len(all_obligations)} obligations, "
                f"{approved} approved or edited, and {pending} pending review. "
                f"Coverage is {round(approved / len(all_obligations) * 100) if all_obligations else 0}%."
            )
    return {
        "answer": answer,
        "citations": [],
        "sources": [],
        "grounded": True,
        "confidence": 1.0,
        "response_type": "workspace_summary",
    }


@router.post("/copilot")
@limiter.limit("20/minute")
def copilot(request: Request, payload: CopilotRequest, session: Session = Depends(get_db)):
    workspace_response = _workspace_response(session, payload.question)
    if workspace_response:
        return workspace_response

    scoped: list[models.Obligation] = []
    if payload.obligation_id:
        ob = crud.get_obligation(session, payload.obligation_id)
        if ob:
            scoped.append(ob)
    if payload.document_id:
        doc = crud.get_document(session, payload.document_id)
        if doc:
            scoped.extend(crud.list_obligations(session, document_id=doc.id))

    search_question = payload.question
    if payload.history and len(_query_terms(search_question)) < 2:
        prior_questions = [turn.content for turn in payload.history if turn.role == "user"]
        if prior_questions:
            search_question = f"{prior_questions[-1]} {search_question}"

    matches = _direct_matches(session, search_question, scoped or None)
    if not matches and scoped:
        matches = scoped[:5]
    return _extractive_response(session, payload.question, matches)
