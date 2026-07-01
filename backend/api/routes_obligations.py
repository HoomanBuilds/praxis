"""Obligation review endpoints — the human-in-the-loop gate (§6.1, §10.5, §7.7)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import schemas
from api.serializers import obligation_to_dict
from db import crud
from db.session import get_db

router = APIRouter(prefix="/api/obligations", tags=["obligations"])


@router.get("")
def list_obligations(
    document_id: str | None = Query(None),
    status: str | None = Query(None),
    functional_area: str | None = Query(None),
    session: Session = Depends(get_db),
):
    rows = crud.list_obligations(
        session, document_id=document_id, status=status, functional_area=functional_area
    )
    return [obligation_to_dict(o) for o in rows]


@router.get("/{obligation_id}")
def get_obligation(obligation_id: str, session: Session = Depends(get_db)):
    ob = crud.get_obligation(session, obligation_id)
    if not ob:
        raise HTTPException(404, "Obligation not found")
    return obligation_to_dict(ob)


@router.post("/{obligation_id}/approve")
def approve(obligation_id: str, action: schemas.ReviewAction, session: Session = Depends(get_db)):
    ob = _require(session, obligation_id)
    crud.review_obligation(session, ob, approve=True, reviewer=action.reviewer, note=action.note)
    session.commit()
    return obligation_to_dict(ob)


@router.post("/{obligation_id}/reject")
def reject(obligation_id: str, action: schemas.ReviewAction, session: Session = Depends(get_db)):
    ob = _require(session, obligation_id)
    crud.review_obligation(session, ob, approve=False, reviewer=action.reviewer, note=action.note)
    session.commit()
    return obligation_to_dict(ob)


@router.patch("/{obligation_id}")
def edit(obligation_id: str, edit: schemas.ObligationEdit, session: Session = Depends(get_db)):
    ob = _require(session, obligation_id)
    crud.edit_obligation(session, ob, edit)
    session.commit()
    return obligation_to_dict(ob)


def _require(session: Session, obligation_id: str):
    ob = crud.get_obligation(session, obligation_id)
    if not ob:
        raise HTTPException(404, "Obligation not found")
    return ob
