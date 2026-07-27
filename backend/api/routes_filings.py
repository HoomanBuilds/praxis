from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import schemas
from db import crud
from db.session import get_db
from api.serializers import obligation_to_dict

router = APIRouter(prefix="/api/filings", tags=["filings"])


@router.get("")
def list_filings(status: str | None = Query(None), session: Session = Depends(get_db)):
    filings = crud.list_filings(session, status=status)
    out = []
    for f in filings:
        o = crud.get_obligation(session, f.obligation_id)
        out.append({
            "id": f.id,
            "obligation_id": f.obligation_id,
            "task_id": f.task_id,
            "filing_type": f.filing_type,
            "status": f.status,
            "submitted_at": f.submitted_at.isoformat() if f.submitted_at else None,
            "confirmation_reference": f.confirmation_reference,
            "notes": f.notes,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "obligation_summary": obligation_to_dict(o) if o else None,
        })
    return {"filings": out, "total": len(out)}


@router.post("")
def create_filing(body: schemas.FilingCreate, session: Session = Depends(get_db)):
    f = crud.create_filing(
        session,
        obligation_id=body.obligation_id,
        task_id=body.task_id,
        filing_type=body.filing_type,
        notes=body.notes,
    )
    return {"id": f.id, "status": f.status}


@router.post("/{filing_id}/submit")
def submit_filing(filing_id: str, session: Session = Depends(get_db)):
    f = crud.get_filing(session, filing_id)
    if not f:
        raise HTTPException(status_code=404, detail="Filing not found")
    ref = f"SEBI-{filing_id[:8].upper()}"
    f = crud.submit_filing(session, filing_id, ref)
    return {"id": f.id, "status": f.status, "confirmation_reference": ref}
