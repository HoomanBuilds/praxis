# 14 · Deployment

PRAXIS runs in two shapes: a zero-Docker local dev mode and a Docker/Postgres/Keycloak mode.
Both share the same code and models. The step-by-step runbook (including env-var mapping and
the new Integrations section) is in [setup-and-run.md](setup-and-run.md).

## Quick start (local, no Docker)

Prereqs: Python 3.11+, Node 18+, Ollama (optional).

```bash
# 1. Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                    # then set PRAXIS_* values as needed

# 2. Run the API (SQLite auto-initialised)
PYTHONPATH=backend .venv/bin/uvicorn api.main:app --port 8080

# 3. Frontend
cd frontend && npm install && npm run dev     # http://localhost:5173
```

- Vite dev server proxies `/api` → `:8080`.
- `db/session.py:init_db()` creates the schema idempotently on startup.
- Interactive API docs: `http://localhost:8080/docs`.

## Docker / production shape

Two compose files, different scope:

- `docker-compose.yml` — local dev support services only (frontend/backend still run
  natively via `uvicorn`/`vite`). 7 services: `postgres`, `redis`, `chromadb`, `api`,
  `worker`, `keycloak`, `openldap`. Identity runs in Docker by default even in local dev
  because Keycloak is heavy to install natively.
- `docker-compose.prod.yml` — the full production stack, 8 services behind one reverse
  proxy. See [02 System Architecture](02_SYSTEM_ARCHITECTURE.md#container--module-view)
  for the topology diagram.

| Service | Port | Notes |
|---|---|---|
| `nginx` | `:80`/`:443` | reverse proxy, TLS termination (prod only) |
| `frontend` | `:8080` internal | built Vite app served by nginx, non-root |
| `api` | `:8080` internal | FastAPI, `alembic upgrade head` runs before `uvicorn` starts |
| `worker` | — | Redis stream consumer, runs Phase A off the request thread |
| `postgres` | `:5432` internal | set `PRAXIS_DATABASE_URL` to use it instead of SQLite |
| `redis` | `:6379` internal | `document.process` queue; also the rate-limit store in prod |
| `chromadb` | `:8000` internal | embedding index for hybrid retrieval |
| `ollama` | `:11434` internal | local LLM runtime |
| `keycloak` (local dev / demo) | `:8081` | **quay.io/keycloak:26.0**, realm `praxis` auto-imported from `data/keycloak/praxis-realm.json` |

### Keycloak demo realm
- Users: `admin@praxis.local` / `admin123`, `officer@praxis.local` / `officer123`
- Client: `praxis-web` (OIDC)
- Start with: `docker compose up -d keycloak`

## Environment variables

`config.py` is the single reader. Full mapping in [setup-and-run.md](setup-and-run.md). Key
groups:

| Group | Variables |
|---|---|
| App | `PRAXIS_DATABASE_URL`, `PRAXIS_APP_NAME`, CORS origins |
| LLM | `PRAXIS_LLM_BASE_URL` (Ollama), `PRAXIS_LLM_MODEL` (default `llama3.1:8b`), `PRAXIS_LLM_API_KEY` |
| Email | `PRAXIS_SMTP_HOST`, `PRAXIS_SMTP_PORT`, `PRAXIS_SMTP_USERNAME`, `PRAXIS_SMTP_PASSWORD`, `PRAXIS_SMTP_FROM` |
| SSO | `PRAXIS_KEYCLOAK_URL`, realm, client id/secret |
| Integrations | `PRAXIS_SLACK_TOKEN`, `PRAXIS_JIRA_*`, `PRAXIS_DRIVE_*`, `PRAXIS_DOCUSIGN_*` |
| Internal | `PRAXIS_INTEGRATION_KEY` (persisted to `data/integration.key`, gitignored) |

## Demo SMTP sink (for live email demo)

Runs on `:2525` with stdlib `smtpd`, **no auth** (blank username/password), logging all
outbound mail to `/tmp/smtp_sink_messages.log`:

```bash
python /tmp/smtp_sink.py   # long-running; log tail proves notification delivery
```

Email config for the sink: host `127.0.0.1`, port `2525`, blank credentials, from
`noreply@praxis.local`.

## Verified state at submission

- Backend test suite: **90 passing**.
- Frontend build clean; `npm test` (Vitest) covers the auth-header and filing-status
  regressions directly.
- CI (`.github/workflows/ci.yml`) runs the backend suite and frontend build/test on every
  push/PR; `deploy.yml` only deploys once that workflow succeeds on `main`.

## Production hardening (see also [17 Limitations & Roadmap](17_LIMITATIONS_AND_ROADMAP.md))

Done:
- ✅ Alembic migrations (`backend/alembic/`) — schema changes no longer go through ad-hoc
  `ALTER TABLE`.
- ✅ RBAC on top of JWT/SSO identity (`api/deps.py` `require_role`) — admin-only routes
  (user management, org config, integrations, API keys, audit export) enforce it.
- ✅ Rate limiting (`slowapi`, Redis-backed in prod) on auth and LLM-bound endpoints.
- ✅ Non-root containers (`backend/Dockerfile`, `frontend/Dockerfile`).
- ✅ Daily Postgres + data-volume backups (`deploy/backup.sh`, restore via `deploy/restore.sh`).

Still open:
- Serve frontend build from the backend origin (single CORS origin) instead of a dev proxy.
- Put Postgres/Keycloak behind the platform's networking; enable encryption-at-rest.
- Multi-tenancy (`firm_id` scoping) — every table is currently global to one firm; this is
  a re-architecture, tracked separately from the hardening pass above.
