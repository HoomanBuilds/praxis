# 02 · System Architecture

PRAXIS is a **modular monolith** with a clean layer boundary: API → services → models. The
relational store is the single source of truth; the knowledge graph is a projection over it;
the LLM is an external-but-local dependency.

## Components

| Component | Tech | Location | Responsibility |
|---|---|---|---|
| API layer | FastAPI | `backend/api/` | REST endpoints, validation, auth (SSO), integration status |
| Orchestration | LangGraph | `backend/services/` | 2-phase agentic pipeline (Phase A extraction, Phase B generation) |
| Preprocessing funnel | Python | `backend/preprocessing/` | document_type → section classifier → fingerprint → rule_extractor |
| Integration adapters | Python (SMTP/IMAP/ICS/OAuth) | `backend/integrations/` | email, calendar, SSO, Slack, Jira, Drive, DocuSign |
| Knowledge graph | Python projection | `backend/kg/graph.py` | on-demand graph + GraphML export |
| Relational store | SQLAlchemy 2.x | `backend/db/` | models, CRUD, audit logging, session |
| LLM runtime | Ollama (local) | external service | default `qwen2.5:7b`; no content leaves the host |
| Web UI | React + TS + Vite | `frontend/` | operator console, review gate, dashboard, settings |
| Identity | Keycloak (Docker) | `docker-compose.yml` | demo realm `praxis`, OIDC for SSO |

## Container / module view

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (React + TS, Vite)  :5173                          │
│  ─ pages: Dashboard, Documents, Obligations, Review,         │
│           Tasks, Calendar, Risk Register, Departments,       │
│           Knowledge Graph, Audit, Settings                   │
│  ─ react-query, useAreas() hook → /api/org-config/…          │
└──────────────────────────┬───────────────────────────────────┘
                           │  /api (Vite proxy → :8080)
┌──────────────────────────▼───────────────────────────────────┐
│  Backend (FastAPI)  :8080                                     │
│  routes_documents  routes_obligations  routes_dashboard       │
│  routes_tasks  routes_audit  routes_integrations  routes_kg   │
│       │                        │                             │
│  services.process_document (LangGraph)                        │
│       │  Phase A (funnel + extraction)                        │
│       │  Phase B (rules → tasks ∥ evidence)                   │
│  preprocessing/  (document_type · classifier · fingerprint    │
│                   · rule_extractor)                           │
│  integrations/   (providers · ics · sso · slack · jira ·      │
│                   drive · docusign)                           │
│  kg/graph.py  (projection + GraphML)                          │
│  db/  models.py · crud.py · session.py · audit               │
└───────────┬───────────────────────────────┬──────────────────┘
            │                               │
   ┌────────▼─────────┐            ┌─────────▼──────────┐
   │ SQLite/Postgres   │            │ Ollama (local LLM) │
   │ system of record  │            │ qwen2.5:7b         │
   └───────────────────┘            └────────────────────┘
```

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

## Runtime view

- Backend: `PYTHONPATH=backend .venv/bin/uvicorn api.main:app --port 8080`
- Frontend: Vite dev server `http://localhost:5173` (proxies `/api` to 8080)
- LLM: Ollama serving locally (optional in "no-LLM" degraded mode)
- Identity (optional): Keycloak container on `:8081`, realm `praxis`

Full setup is in [14 Deployment](14_DEPLOYMENT.md).
