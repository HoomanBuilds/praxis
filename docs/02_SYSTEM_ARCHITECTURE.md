# 02 · System Architecture

PRAXIS is a **modular monolith** with a clean layer boundary: API → services → models. The
relational store is the single source of truth; the knowledge graph is a projection over it;
the LLM is an external-but-local dependency.

## Components

| Component | Tech | Location | Responsibility |
|---|---|---|---|
| API layer | FastAPI | `backend/api/` | REST endpoints, validation, JWT + API-key auth, RBAC, rate limiting |
| Orchestration | LangGraph | `backend/services/` | 2-phase agentic pipeline (Phase A extraction, Phase B generation) |
| Preprocessing funnel | Python | `backend/preprocessing/` | document_type → section classifier → fingerprint → rule_extractor |
| Async worker | Python, Redis Streams | `backend/ingestion/worker.py` | consumes the `document.process` stream, runs Phase A off the request thread; scales horizontally per consumer group |
| Integration adapters | Python (SMTP/IMAP/ICS/OAuth) | `backend/integrations/` | email, calendar, SSO, Slack, Jira, Drive, DocuSign |
| Knowledge graph | Python projection | `backend/kg/graph.py` | on-demand graph + GraphML export |
| Relational store | SQLAlchemy 2.x + Alembic | `backend/db/`, `backend/alembic/` | models, CRUD, audit logging, session, versioned migrations |
| Vector store | ChromaDB | `backend/rag/vector_store.py` | embedding index for hybrid retrieval (corpus + obligation search) |
| Queue / cache | Redis | `backend/ingestion/service.py` | `document.process` stream (async pipeline), rate-limit counters in production |
| LLM runtime | Ollama (local) | external service | default `llama3.1:8b`; no content leaves the host |
| Web UI | React + TS + Vite | `frontend/` | operator console, review gate, dashboard, settings |
| Identity | Keycloak (Docker) | `docker-compose.yml` | demo realm `praxis`, OIDC for SSO — issues the same PRAXIS JWT the password-login flow does |
| Reverse proxy | nginx | `nginx/` | TLS termination, routes `/api` → backend, `/` → frontend |

## Container / module view

Production topology (`docker-compose.prod.yml`) — 8 services behind one reverse proxy:

```
                    ┌───────────────────────────┐
 :80/:443  ────────►│  nginx (TLS termination)  │
                    └───────┬───────────┬───────┘
                            │           │
                  /         │           │  /api
        ┌─────────▼───────┐ │ ┌─────────▼──────────────────────┐
        │ frontend :8080   │ │ │ api :8080 (FastAPI, 2 workers) │
        │ React+TS, Vite   │ │ │ JWT/API-key auth, RBAC,        │
        │ built, served    │ │ │ rate limiting, /metrics        │
        │ by nginx         │ │ └────┬──────────┬────────┬───────┘
        └──────────────────┘ │      │          │        │
                              │      │ Redis    │ Ollama │ Postgres
                              │      │ stream   │ (LLM)  │ (SQLAlchemy
                              │      ▼          │        │  + Alembic)
                              │ ┌─────────────┐ │        │
                              │ │ worker       │ │        │
                              │ │ (Phase A     │◄┘        │
                              │ │ off-thread)  │           │
                              │ └──────┬───────┘           │
                              │        └───────────────────┘
                              │
                              └──► ChromaDB (embedding index for hybrid retrieval)
```

- `api`/`worker`/`postgres`/`redis`/`chromadb`/`ollama` share an internal Docker network;
  only `nginx` is published to the host.
- Document upload can run Phase A synchronously (`process=true`, blocks the request) or
  publish to the `document.process` Redis stream for the `worker` to pick up — the
  scraper and the default upload flow both queue through the worker.
- Backend modules: `routes_documents` `routes_obligations` `routes_compliance`
  `routes_tasks` `routes_auth`/`routes_sso` `routes_integrations` (API layer) →
  `services.process_document` (LangGraph orchestration) → `preprocessing/`
  (document_type · classifier · fingerprint · rule_extractor) → `agents/` (LLM
  extraction, prompt-injection-hardened) → `db/` (models · crud · Alembic migrations ·
  audit).

See [diagrams/architecture.mmd](../diagrams/architecture.mmd) for the rendered flow.

## Data flow (end to end)

```
circular PDF ──► ingest ──► parse (+OCR) ──► funnel:
                    document_type ──► section classifier ──► fingerprint diff
                        └──► rule_extractor (deterministic || LLM)
   obligations (pending_review) ──► officer approves/edits/rejects
   on approval ──► Phase B: rules ──► tasks (owner, deadline)  +  evidence collectors
   every step ──► append-only audit_log
   views: dashboard summary · knowledge graph · risk register · audit reports
```

## Key architectural decisions

1. **Single source of truth + projected graph.** Rather than a separate graph DB, the graph is
   derived from the relational store on demand. The audit trail and the graph can never
   disagree, because there is only one system of record. Swapping in a graph database later
   means re-pointing `kg/graph.py`, no callers change.

2. **Local-first LLM as a decoupled dependency.** The pipeline talks to Ollama over HTTP. That
   keeps regulatory content inside the firm's boundary, makes the model swappable, and means
   the whole system runs on a single laptop for the demo.

3. **LangGraph for stateful orchestration.** The 2-phase pipeline is a stateful graph: nodes
   can be skipped (e.g. "no LLM needed"), re-run, and audited individually. The human gate is
   a real graph node, not a post-hoc filter.

4. **Funnel before the model, not the other way around.** Cost and latency are controlled at
   the input side. Section-level triage decides what the LLM sees; see
   [04 AI Pipeline](04_AI_PIPELINE.md).

5. **Postgres-first, SQLite-portable models.** Same ORM models run on both. No Docker? SQLite.
   Docker? Postgres via `PRAXIS_DATABASE_URL`. This removes a dependency from the demo surface.
   Schema changes go through Alembic (`backend/alembic/`); `create_all()` still runs for a
   fresh dev SQLite file, but new columns/tables are migrations, not ad-hoc `ALTER TABLE`s.

6. **One auth dependency, two credential types.** `api/deps.py`'s `require_user` accepts
   either a JWT bearer token (issued by `/api/auth/login` or the Keycloak SSO callback) or
   an `X-API-Key` header — both resolve to the same `AuthedActor` (id, email, role), so
   every downstream authorization check (`require_role`) and audit-log write is uniform
   regardless of which credential was used.

## Runtime view

- Backend: `PYTHONPATH=backend .venv/bin/uvicorn api.main:app --port 8080` (dev; no auto-
  seeded admin or migration step needed — `init_db()` creates tables directly)
- Frontend: Vite dev server `http://localhost:5173` (proxies `/api` to 8080)
- LLM: Ollama serving locally (optional in "no-LLM" degraded mode)
- Identity (optional): Keycloak container on `:8081`, realm `praxis`
- Production only: `alembic upgrade head` runs before `uvicorn` starts (`docker-compose.prod.yml`);
  `PRAXIS_ENVIRONMENT=production` enables a startup guard that refuses to boot with a
  placeholder `PRAXIS_API_KEY`/`PRAXIS_JWT_SECRET` and skips seeding the dev-only demo admin.

Full setup is in [14 Deployment](14_DEPLOYMENT.md). Auth/RBAC model is in
[12 Security](12_SECURITY.md).
