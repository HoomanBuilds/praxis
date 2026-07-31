# 14 · Deployment

PRAXIS runs in two shapes: a zero-Docker local dev mode and a Docker/Postgres/Keycloak mode.
Both share the same code and models. The step-by-step runbook (including env-var mapping and
the new Integrations section) is in [setup-and-run.md](setup-and-run.md).

## Quick start (local, no Docker)

Prereqs: Python 3.11+, Node 18+, Ollama (optional).

```bash
# 1. Backend
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
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

`docker-compose.yml` provides the full service set. Identity runs in Docker by default even in
local dev because Keycloak is heavy to install natively.

| Service | Port | Notes |
|---|---|---|
| `api` (backend) | `:8080` | FastAPI app |
| `web` (frontend) | `:5173` | built Vite app |
| `db` | Postgres | set `PRAXIS_DATABASE_URL` to use it instead of SQLite |
| `keycloak` | `:8081` | **quay.io/keycloak:26.0**, realm `praxis` auto-imported from `data/keycloak/praxis-realm.json` |

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
| LLM | `PRAXIS_LLM_BASE_URL` (Ollama), `PRAXIS_LLM_MODEL` (default `qwen2.5:7b`), `PRAXIS_LLM_API_KEY` |
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

- Backend test suite: **59 passing**.
- Frontend build clean; demo harnesses (DOM checks, review-dialog flow, email connect flow,
  SSO end-to-end) pass in a real browser.
- Remotes: `origin` `github.com/InferiaAI/praxis`, `hooman` `github.com/HoomanBuilds/praxis`.

## Production hardening (see also [17 Limitations & Roadmap](17_LIMITATIONS_AND_ROADMAP.md))

- Introduce Alembic migrations once schema stabilises.
- Serve frontend build from the backend origin (single CORS origin) instead of a dev proxy.
- Put Postgres/Keycloak behind the platform's networking; enable encryption-at-rest.
- Add RBAC on top of SSO identity (officer vs. admin vs. viewer).
