from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from db import models
from db.session import get_db
from api.deps import AuthedActor, require_user

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/feed.ics")
def calendar_feed(
    token: str = Query(...),
    session: Session = Depends(get_db),
):
    """Subscribable RFC-5545 feed — paste the URL into Outlook / Google Calendar.

    The token is the secret stored (encrypted) when the Calendar integration was
    connected; without it the feed 403s so firm deadlines stay private.
    """
    from integrations import notify
    notify.check_overdue_and_notify()

    from integrations.crypto import decrypt_config

    row = session.scalar(select(models.Integration).where(models.Integration.type == "calendar"))
    if not row or row.status != "connected":
        raise HTTPException(404, "Calendar integration is not connected")
    cfg = decrypt_config(row.config)
    import secrets as _secrets

    if not cfg.get("feed_token") or not _secrets.compare_digest(cfg["feed_token"], token):
        raise HTTPException(403, "Invalid feed token")
    from db import crud
    crud.touch_integration(session, "calendar")
    from integrations.providers import build_ics_feed
    return Response(content=build_ics_feed(session), media_type="text/calendar")


@router.get("")
def get_calendar(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    _actor: AuthedActor = Depends(require_user),
    session: Session = Depends(get_db),
):
    from integrations import notify
    notify.check_overdue_and_notify()

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
