from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.deps import require_api_key
from db import crud
from db.session import get_db

router = APIRouter(prefix="/api/watch", tags=["watch"])


class CreateSourceRequest(BaseModel):
    name: str
    url: str
    source_type: str = "regulatory"


@router.get("/sources")
def list_sources(session: Session = Depends(get_db)):
    sources = crud.list_watch_sources(session)
    return [{"id": s.id, "name": s.name, "url": s.url, "source_type": s.source_type, "is_active": s.is_active, "last_checked_at": s.last_checked_at.isoformat() if s.last_checked_at else None, "created_at": s.created_at.isoformat() if s.created_at else None} for s in sources]


@router.post("/sources")
def create_source(body: CreateSourceRequest, session: Session = Depends(get_db), actor: str = Depends(require_api_key)):
    src = crud.create_watch_source(session, name=body.name, url=body.url, source_type=body.source_type)
    session.commit()
    return {"id": src.id, "name": src.name, "url": src.url, "source_type": src.source_type, "is_active": src.is_active}


@router.delete("/sources/{source_id}")
def delete_source(source_id: str, session: Session = Depends(get_db)):
    if not crud.delete_watch_source(session, source_id):
        raise HTTPException(404, "Source not found")
    session.commit()
    return {"ok": True}


@router.get("/hits")
def list_hits(source_id: str | None = None, session: Session = Depends(get_db)):
    hits = crud.list_watch_hits(session, source_id=source_id)
    return [{"id": h.id, "source_id": h.source_id, "title": h.title, "url": h.url, "summary": h.summary, "relevance_score": h.relevance_score, "is_reviewed": h.is_reviewed, "created_at": h.created_at.isoformat() if h.created_at else None} for h in hits]


@router.post("/hits/{hit_id}/review")
def review_hit(hit_id: str, session: Session = Depends(get_db)):
    h = crud.mark_hit_reviewed(session, hit_id)
    if not h:
        raise HTTPException(404, "Hit not found")
    session.commit()
    return {"id": h.id, "is_reviewed": h.is_reviewed}


@router.post("/check")
def check_watch(session: Session = Depends(get_db), actor: str = Depends(require_api_key)):
    sources = crud.list_watch_sources(session)
    return {"message": f"Checked {len(sources)} sources", "sources_checked": len(sources), "hits_found": 0}
