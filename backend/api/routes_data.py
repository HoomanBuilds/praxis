from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.deps import AuthedActor, require_role
from config import settings
from db import models
from db.session import get_db

router = APIRouter(prefix="/api/data", tags=["data"])


@router.get("/retention-status")
def retention_status(session: Session = Depends(get_db)):
    oldest_entry = session.scalar(select(func.min(models.AuditLog.timestamp)))
    return {
        "retention_days": settings.audit_retention_days,
        "audit_log_entries": session.scalar(select(func.count()).select_from(models.AuditLog)) or 0,
        "oldest_entry": oldest_entry.isoformat() if oldest_entry else None,
    }


@router.post("/export")
def export_audit_log(actor: AuthedActor = Depends(require_role("admin"))):
    session = next(get_db())
    try:
        from db.models import AuditLog
        from sqlalchemy import select
        rows = list(session.scalars(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(1000)))
        import csv, io
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["id", "action", "actor", "resource_type", "resource_id", "timestamp"])
        for r in rows:
            w.writerow([r.id, r.action, r.actor, r.resource_type, r.resource_id, r.timestamp.isoformat() if r.timestamp else ""])
        return Response(
            content=buf.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=audit-export-{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"},
        )
    finally:
        session.close()
