"""PRAXIS FastAPI application (proposal §5.2.4).

Exposes the compliance platform's REST surface: document ingestion + pipeline triggers,
the obligation review gate, rule/task/evidence reads, the compliance dashboard summary and
audit-report generation. CORS is open for the (future) React frontend on localhost.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
from api.deps import require_api_key
from config import settings
from db import crud, models
from db.session import get_db, init_db, session_scope
from rag import corpus_index


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with session_scope() as session:
        if not crud.get_user_by_email(session, "admin@praxis.local"):
            from db.models import hash_password
            admin = models.User(
                email="admin@praxis.local",
                name="Admin",
                hashed_password=hash_password("admin123"),
                role="admin",
            )
            session.add(admin)
            session.commit()
    try:
        if corpus_index.corpus_size() == 0:
            corpus_index.index_corpus(reset=True)
    except Exception as exc:
        print(f"[api] corpus index skipped: {exc}")
    try:
        from integrations import notify
        notify.start_overdue_sweep()
    except Exception as exc:
        print(f"[api] overdue sweep skipped: {exc}")
    try:
        from ingestion.sebi_scraper import start_sebi_monitor
        start_sebi_monitor()
    except Exception as exc:
        print(f"[api] SEBI monitor skipped: {exc}")
    yield


app = FastAPI(
    title="PRAXIS API",
    description="Agentic compliance platform for SEBI-regulated intermediaries",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_documents.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_obligations.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_compliance.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_activity.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_copilot.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_auth.router)
app.include_router(routes_sso.router)
app.include_router(routes_users.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_calendar.router)
app.include_router(routes_watch.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_notifications.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_tasks.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_org_config.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_filings.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_api_keys.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_data.router, dependencies=[Depends(require_api_key)])
app.include_router(routes_integrations.router, dependencies=[Depends(require_api_key)])


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
