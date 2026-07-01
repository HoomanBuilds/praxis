"""Activity feed + universal search endpoints (workspace UI)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from db import crud, models
from db.session import get_db

router = APIRouter(prefix="/api", tags=["workspace"])


@router.get("/activity")
def activity(
    limit: int = Query(60, le=200),
    resource_id: str | None = Query(None),
    session: Session = Depends(get_db),
):
    """The live activity feed — the real append-only audit log (§10.3)."""
    rows = crud.list_activity(session, limit=limit, resource_id=resource_id)
    return [
        {
            "id": r.id,
            "action": r.action,
            "actor": r.actor,
            "resource_type": r.resource_type,
            "resource_id": r.resource_id,
            "after": r.after,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        }
        for r in rows
    ]


@router.get("/search")
def search(q: str = Query("", min_length=0), session: Session = Depends(get_db)):
    """Universal search across documents and obligations (semantic + keyword) for the ⌘K
    command palette."""
    q = q.strip()
    documents: list[dict] = []
    obligations: dict[str, dict] = {}
    if q:
        docs = session.scalars(
            select(models.Document).where(
                or_(models.Document.title.ilike(f"%{q}%"), models.Document.reference.ilike(f"%{q}%"))
            )
        ).all()
        documents = [{"id": d.id, "title": d.title, "reference": d.reference} for d in docs[:8]]

        # Semantic hits from the obligation vector index, then keyword fallback.
        try:
            from rag import vector_store

            hits = vector_store.query(vector_store.OBLIGATION_COLLECTION, q, n_results=8)
            ids = [h.id for h in hits]
            if ids:
                for o in session.scalars(select(models.Obligation).where(models.Obligation.id.in_(ids))):
                    obligations[o.id] = o
        except Exception:
            pass
        for o in session.scalars(
            select(models.Obligation).where(models.Obligation.description.ilike(f"%{q}%")).limit(8)
        ):
            obligations[o.id] = o

    return {
        "query": q,
        "documents": documents,
        "obligations": [
            {
                "id": o.id,
                "identifier": o.identifier,
                "description": o.description,
                "document_id": o.document_id,
                "functional_area": o.functional_area,
                "confidence": o.confidence,
                "status": o.status,
            }
            for o in list(obligations.values())[:10]
        ],
    }
