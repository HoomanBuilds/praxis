from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from api.deps import AuthedActor, require_role
from db import crud

router = APIRouter(prefix="/api/data", tags=["data"])


@router.get("/retention-status")
def retention_status():
    cfg = crud.read_org_config()
    from config import settings
    retention_days = settings.audit_retention_days
    return {
        "audit_log_retention_days": retention_days,
        "org_config_path": str(crud._org_config_path()),
        "firm_name": cfg.get("firm_name", ""),
    }


@router.post("/export")
def export_audit_log(actor: AuthedActor = Depends(require_role("admin"))):
    from db.session import get_db
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
