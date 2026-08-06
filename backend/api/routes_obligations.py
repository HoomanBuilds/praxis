"""Obligation review endpoints — the human-in-the-loop gate (§6.1, §10.5, §7.7)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

import schemas
from api.deps import AuthedActor, require_user
from api.serializers import obligation_to_dict
from db import crud
from db.session import get_db
from preprocessing.rule_extractor import _MANDATORY_RE, _QUALITATIVE_RE

router = APIRouter(prefix="/api/obligations", tags=["obligations"])


@router.get("")
def list_obligations(
    document_id: str | None = Query(None),
    status: str | None = Query(None),
    functional_area: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_db),
):
    rows = crud.list_obligations(
        session, document_id=document_id, status=status, functional_area=functional_area
    )
    total = len(rows)
    page = rows[offset : offset + limit]
    return {"items": [obligation_to_dict(o) for o in page], "total": total, "offset": offset, "limit": limit}


@router.get("/{obligation_id}")
def get_obligation(obligation_id: str, session: Session = Depends(get_db)):
    ob = crud.get_obligation(session, obligation_id)
    if not ob:
        raise HTTPException(404, "Obligation not found")
    return obligation_to_dict(ob)


@router.post("/{obligation_id}/approve")
def approve(
    obligation_id: str,
    action: schemas.ReviewAction,
    session: Session = Depends(get_db),
    actor: AuthedActor = Depends(require_user),
):
    ob = _require(session, obligation_id)
    crud.review_obligation(session, ob, approve=True, reviewer=actor.actor_label, note=action.note)
    session.commit()
    return obligation_to_dict(ob)


@router.post("/{obligation_id}/reject")
def reject(
    obligation_id: str,
    action: schemas.ReviewAction,
    session: Session = Depends(get_db),
    actor: AuthedActor = Depends(require_user),
):
    ob = _require(session, obligation_id)
    crud.review_obligation(session, ob, approve=False, reviewer=actor.actor_label, note=action.note)
    session.commit()
    return obligation_to_dict(ob)


@router.patch("/{obligation_id}")
def edit(obligation_id: str, edit: schemas.ObligationEdit, session: Session = Depends(get_db)):
    ob = _require(session, obligation_id)
    crud.edit_obligation(session, ob, edit)
    session.commit()
    return obligation_to_dict(ob)


@router.get("/{obligation_id}/explain")
def explain(obligation_id: str, session: Session = Depends(get_db)):
    """Real, recomputed explainability for an extraction — no black box, no fabrication.
    Reasoning is derived from the same deterministic signals the pipeline used."""
    ob = _require(session, obligation_id)
    src = ob.source_text or ""
    has_verb = bool(_MANDATORY_RE.search(src))
    qual = _QUALITATIVE_RE.search(src)

    if ob.extraction_method == "deterministic":
        why_method = (
            "PRAXIS identified this obligation because the source contains a mandatory "
            "compliance requirement."
        )
    elif qual:
        why_method = (
            f"PRAXIS identified this obligation through analytical review: the source uses "
            f"qualitative language (\"{qual.group(0)}\") that calls for judgement, so a "
            "compliance specialist should confirm the exact requirement."
        )
    else:
        why_method = (
            "PRAXIS identified this obligation through analytical review of the source text, "
            "because the requirement could not be resolved from a fixed rule alone."
        )

    factors = []
    factors.append({"signal": "Mandatory verb present in source", "value": has_verb,
                    "effect": "supports a binding obligation" if has_verb else "−0.20 (no explicit 'shall'/'must')"})
    factors.append({"signal": "Qualitative language", "value": bool(qual),
                    "effect": "needs human judgement" if qual else "precise, rule-evaluable"})
    factors.append({"signal": "Functional area assigned", "value": ob.functional_area,
                    "effect": "clear ownership" if ob.functional_area != "other" else "−0.15 (uncertain ownership)"})

    related = []
    try:
        from rag import vector_store
        hits = vector_store.query(vector_store.OBLIGATION_COLLECTION, ob.description, n_results=4)
        for h in hits:
            if h.id == ob.id:
                continue
            other = crud.get_obligation(session, h.id)
            if other:
                related.append({"id": other.id, "identifier": other.identifier,
                                "description": other.description[:120], "score": round(h.score, 3)})
    except Exception:
        pass

    return {
        "obligation_id": ob.id,
        "identifier": ob.identifier,
        "extraction_method": ob.extraction_method,
        "why_method": why_method,
        "confidence": ob.confidence,
        "confidence_note": "Calibrated from objective signals and capped at 98% — the system never claims full certainty.",
        "confidence_factors": factors,
        "source_paragraph_ref": ob.source_paragraph_ref,
        "source_text": ob.source_text,
        "model": "llama3.1:8b (local)" if ob.extraction_method == "llm" else "deterministic regex engine",
        "related_obligations": related[:3],
    }


class CommentIn(BaseModel):
    author: str = "compliance_officer"
    body: str


@router.get("/{obligation_id}/comments")
def get_comments(obligation_id: str, session: Session = Depends(get_db)):
    _require(session, obligation_id)
    rows = crud.list_comments(session, obligation_id)
    return [{"id": c.id, "author": c.author, "body": c.body,
             "created_at": c.created_at.isoformat() if c.created_at else None} for c in rows]


@router.post("/{obligation_id}/comments")
def add_comment(
    obligation_id: str,
    comment: CommentIn,
    session: Session = Depends(get_db),
    actor: AuthedActor = Depends(require_user),
):
    _require(session, obligation_id)
    row = crud.create_comment(session, obligation_id, actor.actor_label, comment.body)
    session.commit()
    return {"id": row.id, "author": row.author, "body": row.body,
            "created_at": row.created_at.isoformat() if row.created_at else None}


def _require(session: Session, obligation_id: str):
    ob = crud.get_obligation(session, obligation_id)
    if not ob:
        raise HTTPException(404, "Obligation not found")
    return ob
