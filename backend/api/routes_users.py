from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.deps import require_api_key
from db import crud
from db.session import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


class CreateUserRequest(BaseModel):
    email: str
    name: str
    password: str = Field(min_length=6)
    role: str = "viewer"


class UpdateRoleRequest(BaseModel):
    role: str


@router.get("")
def list_users(session: Session = Depends(get_db), actor: str = Depends(require_api_key)):
    users = crud.list_users(session)
    return [{"id": u.id, "email": u.email, "name": u.name, "role": u.role, "is_active": u.is_active, "created_at": u.created_at.isoformat() if u.created_at else None} for u in users]


@router.post("")
def create_user(body: CreateUserRequest, session: Session = Depends(get_db), actor: str = Depends(require_api_key)):
    existing = crud.get_user_by_email(session, body.email)
    if existing:
        raise HTTPException(409, "Email already registered")
    user = crud.create_user(session, body.email, body.name, body.password, body.role)
    session.commit()
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role, "is_active": user.is_active}


@router.patch("/{user_id}/role")
def update_role(user_id: str, body: UpdateRoleRequest, session: Session = Depends(get_db), actor: str = Depends(require_api_key)):
    user = crud.get_user(session, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    crud.update_user_role(session, user, body.role, actor)
    session.commit()
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}


@router.post("/{user_id}/deactivate")
def deactivate(user_id: str, session: Session = Depends(get_db), actor: str = Depends(require_api_key)):
    user = crud.get_user(session, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    crud.deactivate_user(session, user, actor)
    session.commit()
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role, "is_active": user.is_active}
