from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import schemas
from api.deps import AuthedActor, require_role
from db import crud
from db.session import get_db

router = APIRouter(prefix="/api/api-keys", tags=["api-keys"])


@router.get("")
def list_api_keys(session: Session = Depends(get_db)):
    keys = crud.list_api_keys(session)
    return [
        {
            "id": k.id,
            "label": k.label,
            "created_by": k.created_by,
            "created_at": k.created_at.isoformat() if k.created_at else None,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "revoked_at": k.revoked_at.isoformat() if k.revoked_at else None,
        }
        for k in keys
    ]


@router.post("")
def create_api_key(body: ApiKeyCreate, session: Session = Depends(get_db), actor: AuthedActor = Depends(require_role("admin"))):
    row, raw_key = crud.create_api_key(session, label=body.label, created_by=actor.actor_label)
    return {
        "id": row.id,
        "label": row.label,
        "api_key": raw_key,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "warning": "Store this key securely — it won't be shown again.",
    }


@router.post("/{key_id}/revoke")
def revoke_api_key(key_id: str, session: Session = Depends(get_db), actor: AuthedActor = Depends(require_role("admin"))):
    row = crud.revoke_api_key(session, key_id, actor=actor.actor_label)
    if not row:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"id": row.id, "revoked_at": row.revoked_at.isoformat() if row.revoked_at else None}


class ApiKeyCreate(BaseModel):
    label: str = ""
