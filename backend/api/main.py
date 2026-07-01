"""PRAXIS FastAPI application (proposal §5.2.4).

Exposes the compliance platform's REST surface: document ingestion + pipeline triggers,
the obligation review gate, rule/task/evidence reads, the compliance dashboard summary and
audit-report generation. CORS is open for the (future) React frontend on localhost.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import (
    routes_activity,
    routes_compliance,
    routes_copilot,
    routes_documents,
    routes_obligations,
)
from config import settings
from db.session import init_db
from rag import corpus_index


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        if corpus_index.corpus_size() == 0:
            corpus_index.index_corpus(reset=True)
    except Exception as exc:  # corpus indexing is best-effort at startup
        print(f"[api] corpus index skipped: {exc}")
    yield


app = FastAPI(
    title="PRAXIS / RegPilot API",
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

app.include_router(routes_documents.router)
app.include_router(routes_obligations.router)
app.include_router(routes_compliance.router)
app.include_router(routes_activity.router)
app.include_router(routes_copilot.router)


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
    return {"name": "PRAXIS / RegPilot", "docs": "/docs", "health": "/api/health"}
