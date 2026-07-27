from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from db import models
from db.session import get_db

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("")
def get_calendar(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    session: Session = Depends(get_db),
):
    tasks = list(session.scalars(select(models.Task).where(models.Task.deadline.isnot(None))))
    obligations = list(session.scalars(select(models.Obligation).where(models.Obligation.deadline_hint.isnot(None))))

    events = []
    for t in tasks:
        d = t.deadline.isoformat() if t.deadline else None
        if not d:
            continue
        if from_date and d < from_date:
            continue
        if to_date and d > to_date:
            continue
        events.append({
            "id": t.id,
            "date": d,
            "type": "task",
            "title": t.title,
            "status": t.status,
            "owner": t.primary_owner,
            "resource_type": "task",
            "resource_id": t.id,
            "obligation_id": t.obligation_id,
            "functional_area": t.functional_area,
        })

    for o in obligations:
        d = o.deadline_hint
        if not d:
            continue
        if from_date and d < from_date:
            continue
        if to_date and d > to_date:
            continue
        events.append({
            "id": o.id,
            "date": d,
            "type": "obligation",
            "title": o.description[:120],
            "status": o.status,
            "owner": "",
            "resource_type": "obligation",
            "resource_id": o.id,
            "obligation_id": o.id,
            "functional_area": o.functional_area,
        })

    events.sort(key=lambda e: e["date"])
    return {"events": events, "total": len(events)}
