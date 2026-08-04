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
    """Run the SEBI monitor once, now, instead of waiting for the next poll.

    This performs the real scrape (robots-checked and throttled), so it can take a
    few seconds. The counts returned are what actually happened.
    """
    before = len(crud.list_watch_hits(session))
    try:
        from ingestion.sebi_scraper import MONITORED_SOURCES, run_once_now
    except ImportError:
        raise HTTPException(503, "SEBI monitor is not available in this deployment")

    try:
        ingested = run_once_now()
    except Exception as exc:  # a scrape failure is a result, not a 500
        return {
            "message": f"Check failed: {exc}",
            "sources_checked": len(MONITORED_SOURCES),
            "hits_found": 0,
            "documents_ingested": 0,
            "ok": False,
        }

    session.expire_all()
    found = len(crud.list_watch_hits(session)) - before
    return {
        "message": f"Checked {len(MONITORED_SOURCES)} sources — {found} new circular(s), {ingested} ingested",
        "sources_checked": len(MONITORED_SOURCES),
        "hits_found": max(0, found),
        "documents_ingested": ingested,
        "ok": True,
    }


@router.get("/sebi-status")
def sebi_monitor_status():
    """Current state of the automatic SEBI monitor, including what it actually watches.

    The source list is served from the scraper's own configuration so the UI can never
    advertise a page the monitor isn't really polling.
    """
    try:
        from ingestion.sebi_scraper import MONITORED_SOURCES, get_state
    except ImportError:
        return {"last_checked_at": None, "last_error": "scraper module not available",
                "new_hits_since_reset": 0, "total_ingested": 0, "sources": []}
    state = get_state()
    state["sources"] = [{"name": name, "url": url} for url, name in MONITORED_SOURCES]
    return state
