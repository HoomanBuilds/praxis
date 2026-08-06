"""PRAXIS FastAPI application (proposal §5.2.4).

Exposes the compliance platform's REST surface: document ingestion + pipeline triggers,
the obligation review gate, rule/task/evidence reads, the compliance dashboard summary and
audit-report generation. CORS is open for the (future) React frontend on localhost.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from api import (
    routes_activity,
    routes_api_keys,
    routes_auth,
    routes_calendar,
    routes_compliance,
    routes_copilot,
    routes_data,
    routes_documents,
    routes_filings,
    routes_integrations,
    routes_notifications,
    routes_obligations,
    routes_org_config,
    routes_sso,
    routes_tasks,
    routes_users,
    routes_watch,
)
from api.deps import require_user
from api.rate_limit import limiter
from config import settings
from db import crud, models
from db.session import get_db, init_db, session_scope
from logging_config import configure_logging, new_request_id, request_id_var
from rag import corpus_index

logger = logging.getLogger(__name__)

_PLACEHOLDER_SECRETS = {"", "change-me-in-production", "CHANGE_ME_GENERATE_RANDOM_KEY", "CHANGE_ME_GENERATE_RANDOM_64_CHARS"}


def _check_production_secrets() -> None:
    """Refuse to boot in production with a placeholder API key or JWT secret.

    Both default to insecure-but-convenient values for local dev/tests (see
    config.py), which is fine until PRAXIS_ENVIRONMENT=production is set — at that
    point a still-placeholder secret means the whole API is either unauthenticated
    or forgeable, so crash loudly instead of running that way silently.
    """
    if settings.environment != "production":
        return
    if settings.api_key in _PLACEHOLDER_SECRETS or settings.jwt_secret in _PLACEHOLDER_SECRETS:
        raise RuntimeError(
            "PRAXIS_API_KEY and/or PRAXIS_JWT_SECRET are unset or still a placeholder value "
            "while PRAXIS_ENVIRONMENT=production. Generate real secrets (e.g. `openssl rand "
            "-hex 32`) before starting the server."
        )
    if bool(settings.bootstrap_admin_email) != bool(settings.bootstrap_admin_password):
        raise RuntimeError(
            "PRAXIS_BOOTSTRAP_ADMIN_EMAIL and PRAXIS_BOOTSTRAP_ADMIN_PASSWORD must either "
            "both be set or both be empty."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    _check_production_secrets()
    init_db()
    with session_scope() as session:
        admin_email = settings.bootstrap_admin_email.strip().lower()
        admin_password = settings.bootstrap_admin_password
        if settings.environment != "production":
            admin_email = admin_email or "admin@praxis.local"
            admin_password = admin_password or "admin123"
        if admin_email and admin_password and not crud.get_user_by_email(session, admin_email):
            from db.models import hash_password
            admin = models.User(
                email=admin_email,
                name="Admin",
                hashed_password=hash_password(admin_password),
                role="admin",
            )
            session.add(admin)
            session.commit()
    try:
        if corpus_index.corpus_size() == 0:
            corpus_index.index_corpus(reset=True)
    except Exception as exc:
        logger.warning("corpus index skipped: %s", exc)
    try:
        from integrations import notify
        notify.start_overdue_sweep()
    except Exception as exc:
        logger.warning("overdue sweep skipped: %s", exc)
    try:
        from ingestion.sebi_scraper import start_sebi_monitor
        start_sebi_monitor()
    except Exception as exc:
        logger.warning("SEBI monitor skipped: %s", exc)
    yield


app = FastAPI(
    title="PRAXIS API",
    description="Agentic compliance platform for SEBI-regulated intermediaries",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://praxis.inferia.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or new_request_id()
    token = request_id_var.set(rid)
    try:
        response = await call_next(request)
    finally:
        request_id_var.reset(token)
    response.headers["X-Request-ID"] = rid
    return response


Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

app.include_router(routes_documents.router, dependencies=[Depends(require_user)])
app.include_router(routes_obligations.router, dependencies=[Depends(require_user)])
app.include_router(routes_compliance.router, dependencies=[Depends(require_user)])
app.include_router(routes_activity.router, dependencies=[Depends(require_user)])
app.include_router(routes_copilot.router, dependencies=[Depends(require_user)])
app.include_router(routes_auth.router)
app.include_router(routes_sso.router)
app.include_router(routes_users.router, dependencies=[Depends(require_user)])
app.include_router(routes_calendar.router)
app.include_router(routes_watch.router, dependencies=[Depends(require_user)])
app.include_router(routes_notifications.router, dependencies=[Depends(require_user)])
app.include_router(routes_tasks.router, dependencies=[Depends(require_user)])
app.include_router(routes_org_config.router, dependencies=[Depends(require_user)])
app.include_router(routes_filings.router, dependencies=[Depends(require_user)])
app.include_router(routes_api_keys.router, dependencies=[Depends(require_user)])
app.include_router(routes_data.router, dependencies=[Depends(require_user)])
app.include_router(routes_integrations.router, dependencies=[Depends(require_user)])


@app.get("/api/health")
def health():
    from ingestion.service import queue_depth
    from llm import health_check

    out = {"status": "ok", "corpus_chunks": 0, "queue_depth": 0}
    try:
        out["corpus_chunks"] = corpus_index.corpus_size()
    except Exception:
        pass
    try:
        out["queue_depth"] = queue_depth()
    except Exception:
        pass
    try:
        out["llm"] = health_check()
    except Exception as exc:
        out["llm"] = {"error": str(exc)}
    out["model"] = settings.llm_model
    return out


@app.get("/")
def root():
    return {"name": "PRAXIS", "docs": "/docs", "health": "/api/health"}
