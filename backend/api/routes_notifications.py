from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from db import crud
from db.session import get_db

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user_id: str = Query("dev_user"), unread_only: bool = Query(False), session: Session = Depends(get_db)):
    notes = crud.list_notifications(session, user_id, unread_only=unread_only)
    return {"items": [{"id": n.id, "title": n.title, "body": n.body, "category": n.category, "resource_type": n.resource_type, "resource_id": n.resource_id, "is_read": n.is_read, "created_at": n.created_at.isoformat() if n.created_at else None} for n in notes], "total": len(notes)}


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, session: Session = Depends(get_db)):
    n = crud.mark_notification_read(session, notification_id)
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(user_id: str = Query("dev_user"), session: Session = Depends(get_db)):
    count = crud.mark_all_notifications_read(session, user_id)
    return {"ok": True, "marked": count}
