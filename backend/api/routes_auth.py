from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from config import settings
from db import crud
from db.session import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def create_access_token(user_id: str, email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": user_id, "email": email, "role": role, "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    if not credentials:
        raise HTTPException(401, "Not authenticated")
    try:
        return jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, session: Session = Depends(get_db)):
    user = crud.get_user_by_email(session, body.email)
    if not user or not user.is_active:
        raise HTTPException(401, "Invalid credentials")
    from db.models import verify_password
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(user.id, user.email, user.role)
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "name": user.name, "role": user.role},
    )


@router.get("/me")
def get_me(payload: dict = Depends(decode_token), session: Session = Depends(get_db)):
    user = crud.get_user(session, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(401, "User not found")
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}
