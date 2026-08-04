"""AI Copilot — a context-aware compliance analyst grounded in real platform state.

The copilot never answers from parametric memory alone: it assembles context from the actual
obligations, rules, tasks and regulatory metadata in the database (plus semantic retrieval
over the obligation index) and instructs the local model to answer only from that context.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db import crud, models
from db.session import get_db

router = APIRouter(prefix="/api", tags=["copilot"])


class CopilotRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    document_id: str | None = None
    obligation_id: str | None = None


class Citation(BaseModel):
    """One grounded source backing a copilot answer.

    ``obligation_identifier`` must be copied verbatim from the context — the endpoint
    discards any citation whose identifier is not actually present, so a hallucinated
    reference can never reach the UI.
    """

    obligation_identifier: str = Field(..., description="Obligation ID exactly as it appears in CONTEXT")
    circular_reference: str = Field("", description="Circular/regulation reference, empty if not in context")
    paragraph: str = Field("", description="Paragraph or section reference, empty if not in context")
    quote: str = Field("", description="Short verbatim snippet from the context supporting the answer")


class CopilotAnswer(BaseModel):
    """Schema the model must satisfy — free-text citations are not accepted."""

    answer: str = Field(..., description="The analyst answer, grounded only in CONTEXT")
    citations: list[Citation] = Field(default_factory=list)
    grounded: bool = Field(
        ...,
        description="True only if CONTEXT fully supports the answer; False if you had to "
                    "say the context was insufficient",
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in the answer, 0-1")


SYSTEM_PROMPT = (
    "You are Praxis, an AI compliance analyst for SEBI-regulated intermediaries. Answer the "
    "user's question using ONLY the CONTEXT provided below, which is real data from the "
    "compliance platform. Be concise and specific. Never invent regulations, numbers, "
    "obligations, owners or deadlines that are not in the context.\n\n"
    "Grounding rules — these are mandatory:\n"
    "1. Every claim in your answer must be traceable to a line in CONTEXT.\n"
    "2. Populate 'citations' with the obligation identifiers you actually relied on, "
    "copied character-for-character from CONTEXT. Do not cite anything not in CONTEXT.\n"
    "3. If CONTEXT does not contain enough information to answer confidently, set "
    "'grounded' to false, leave 'citations' empty, and use 'answer' to state plainly what "
    "is missing and where the user could look. Do not answer from general knowledge.\n"
    "4. 'confidence' must reflect how well CONTEXT supports the answer, not how "
    "plausible the answer sounds."
)

import hashlib
PROMPT_VERSION = "2.0.0"
PROMPT_HASH = hashlib.sha256(SYSTEM_PROMPT.encode()).hexdigest()[:12]


def _obligation_block(session: Session, ob: models.Obligation) -> str:
    rules = crud.list_rules(session, obligation_id=ob.id)
    tasks = crud.list_tasks(session, obligation_id=ob.id)
    lines = [
        f"SELECTED OBLIGATION {ob.identifier} (confidence {ob.confidence:.0%}, "
        f"{ob.extraction_method} extraction, area={ob.functional_area}, status={ob.status}):",
        f"  Description: {ob.description}",
        f"  Source (¶{ob.source_paragraph_ref}): \"{ob.source_text}\"",
    ]
    for r in rules:
        lines.append(f"  Rule: {r.rule_type} — {r.evaluation_criterion}"
                     + (f" (timeline: {r.timeline})" if r.timeline else ""))
    for t in tasks:
        lines.append(f"  Task: {t.title} — owner {t.primary_owner}"
                     + (f", due {t.deadline}" if t.deadline else ""))
    return "\n".join(lines)


def _document_block(session: Session, doc: models.Document) -> str:
    obs = crud.list_obligations(session, document_id=doc.id)
    ctx = doc.regulatory_context or {}
    lines = [
        f"SELECTED DOCUMENT: {doc.title or doc.reference} ({doc.document_type}, {doc.page_count} pages).",
    ]
    if ctx.get("summary"):
        lines.append(f"  Regulatory summary: {ctx['summary']}")
    if ctx.get("intermediary_classes"):
        lines.append(f"  Applies to: {', '.join(ctx['intermediary_classes'])}")
    lines.append(f"  {len(obs)} obligations extracted. Sample:")
    for o in obs[:12]:
        lines.append(f"   - {o.identifier} [{o.functional_area}, {o.status}] {o.description[:90]}")
    return "\n".join(lines)


def _retrieved_block(
    session: Session, question: str, exclude_doc: str | None
) -> tuple[str, list[models.Obligation]]:
    """Semantic-search block plus the obligations behind it (for citation verification)."""
    try:
        from rag import vector_store
        hits = vector_store.query(vector_store.OBLIGATION_COLLECTION, question, n_results=8)
    except Exception:
        return "", []
    lines = []
    found: list[models.Obligation] = []
    for h in hits:
        o = crud.get_obligation(session, h.id)
        if o:
            found.append(o)
            doc = crud.get_document(session, o.document_id) if o.document_id else None
            ref = (doc.reference if doc else "") or "—"
            lines.append(
                f"   - {o.identifier} [{o.functional_area}, {o.status}] "
                f"(circular {ref}, ¶{o.source_paragraph_ref or '—'}) {o.description[:100]}"
            )
    if not lines:
        return "", []
    return "OBLIGATIONS RELEVANT TO THE QUESTION (semantic search):\n" + "\n".join(lines), found


def _citable(session: Session, ob: models.Obligation) -> dict:
    """Server-side truth for one citable obligation — never taken from the model."""
    doc = crud.get_document(session, ob.document_id) if ob.document_id else None
    return {
        "obligation_id": ob.id,
        "obligation_identifier": ob.identifier,
        "circular_reference": (doc.reference if doc else "") or "",
        "paragraph": ob.source_paragraph_ref or "",
        "functional_area": ob.functional_area,
        "status": ob.status,
    }


def _verify_citations(raw_citations, citable: dict[str, dict]) -> list[dict]:
    """Keep only citations pointing at obligations that were actually in context.

    The circular reference and paragraph are overwritten from the database rather
    than trusted from the model, so a citation can never misattribute a source.
    """
    verified: list[dict] = []
    seen: set[str] = set()
    for c in raw_citations:
        ident = (c.obligation_identifier or "").strip()
        record = citable.get(ident)
        if not record or ident in seen:
            continue
        seen.add(ident)
        verified.append({**record, "quote": (c.quote or "").strip()[:300]})
    return verified


@router.post("/copilot")
def copilot(payload: CopilotRequest, session: Session = Depends(get_db)):
    blocks: list[str] = []
    citable: dict[str, dict] = {}

    def _offer(ob: models.Obligation) -> None:
        if ob and ob.identifier:
            citable[ob.identifier] = _citable(session, ob)

    if payload.obligation_id:
        ob = crud.get_obligation(session, payload.obligation_id)
        if ob:
            blocks.append(_obligation_block(session, ob))
            _offer(ob)
    if payload.document_id:
        doc = crud.get_document(session, payload.document_id)
        if doc:
            blocks.append(_document_block(session, doc))
            for o in crud.list_obligations(session, document_id=doc.id)[:12]:
                _offer(o)

    retrieved, retrieved_obs = _retrieved_block(session, payload.question, payload.document_id)
    if retrieved:
        blocks.append(retrieved)
        for o in retrieved_obs:
            _offer(o)

    if not blocks:
        blocks.append("No specific obligation or document is selected, and no relevant obligations "
                      "were found for this question.")

    context = "\n\n".join(blocks)
    user_prompt = f"CONTEXT:\n{context}\n\n---\nQUESTION: {payload.question}\n\nAnswer:"

    try:
        from llm import structured_complete
        result = structured_complete(SYSTEM_PROMPT, user_prompt, CopilotAnswer)
    except Exception as exc:
        return {
            "answer": None,
            "error": f"Analysis service unavailable: {exc}",
            "citations": [],
            "sources": [],
            "grounded": False,
        }

    parsed: CopilotAnswer = result.parsed  # type: ignore[assignment]
    citations = _verify_citations(parsed.citations, citable)
    # "Grounded" is asserted only when the model claimed grounding AND at least one
    # citation survived verification against real context — never hardcoded.
    grounded = bool(parsed.grounded and citations)
    return {
        "answer": parsed.answer,
        "citations": citations,
        "sources": [c["obligation_identifier"] for c in citations],
        "grounded": grounded,
        "confidence": round(parsed.confidence, 2),
        "prompt_version": PROMPT_VERSION,
        "prompt_hash": PROMPT_HASH,
    }
