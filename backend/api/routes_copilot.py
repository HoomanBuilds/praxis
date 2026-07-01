"""AI Copilot — a context-aware compliance analyst grounded in real platform state.

The copilot never answers from parametric memory alone: it assembles context from the actual
obligations, rules, tasks and regulatory metadata in the database (plus semantic retrieval
over the obligation index) and instructs the local model to answer only from that context.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import crud, models
from db.session import get_db

router = APIRouter(prefix="/api", tags=["copilot"])


class CopilotRequest(BaseModel):
    question: str
    document_id: str | None = None
    obligation_id: str | None = None


SYSTEM_PROMPT = (
    "You are Praxis, an AI compliance analyst for SEBI-regulated intermediaries. Answer the "
    "user's question using ONLY the CONTEXT provided below, which is real data from the "
    "compliance platform. Be concise and specific. Cite obligation identifiers (e.g. "
    "ABC12345-OB-003) and functional areas where relevant. If the context does not contain "
    "enough information to answer, say so plainly and state what is missing. Never invent "
    "regulations, numbers, obligations, owners or deadlines that are not in the context."
)


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


def _retrieved_block(session: Session, question: str, exclude_doc: str | None) -> str:
    try:
        from rag import vector_store
        hits = vector_store.query(vector_store.OBLIGATION_COLLECTION, question, n_results=8)
    except Exception:
        return ""
    lines = []
    for h in hits:
        o = crud.get_obligation(session, h.id)
        if o:
            lines.append(f"   - {o.identifier} [{o.functional_area}, {o.status}] {o.description[:100]}")
    return "OBLIGATIONS RELEVANT TO THE QUESTION (semantic search):\n" + "\n".join(lines) if lines else ""


@router.post("/copilot")
def copilot(payload: CopilotRequest, session: Session = Depends(get_db)):
    blocks: list[str] = []
    sources: list[str] = []

    if payload.obligation_id:
        ob = crud.get_obligation(session, payload.obligation_id)
        if ob:
            blocks.append(_obligation_block(session, ob))
            sources.append(ob.identifier)
    if payload.document_id:
        doc = crud.get_document(session, payload.document_id)
        if doc:
            blocks.append(_document_block(session, doc))

    retrieved = _retrieved_block(session, payload.question, payload.document_id)
    if retrieved:
        blocks.append(retrieved)

    if not blocks:
        blocks.append("No specific obligation or document is selected, and no relevant obligations "
                      "were found for this question.")

    context = "\n\n".join(blocks)
    user_prompt = f"CONTEXT:\n{context}\n\n---\nQUESTION: {payload.question}\n\nAnswer:"

    try:
        from llm import complete
        answer = complete(SYSTEM_PROMPT, user_prompt)
    except Exception as exc:
        return {"answer": None, "error": f"Local model unavailable: {exc}", "sources": sources}

    return {"answer": answer, "sources": sources, "grounded": True}
