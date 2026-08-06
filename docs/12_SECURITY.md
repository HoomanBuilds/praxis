# 12 · Security

PRAXIS handles a firm's regulatory corpus — sensitive by nature. The security posture is
**local-first, least-privilege, and audit-backed**.

## 1 · Local-first LLM (the headline control)

- The LLM runs **locally via Ollama** (default `llama3.1:8b`). Regulatory content **never
  leaves the client boundary** — no prompt or document text is sent to a third-party API.
- Model identity and endpoint are configurable (`PRAXIS_LLM_*`), so a firm can point at its
  own gateway without code changes.
- This is a first-class design decision, not a demo convenience: see
  [04 AI Pipeline](04_AI_PIPELINE.md) and [17 Limitations & Roadmap](17_LIMITATIONS_AND_ROADMAP.md).

## 2 · Secrets & configuration

- Secrets live in **environment variables** (`.env`, never committed). `.env.example`
  documents every variable; `config.py` is the single reader.
- `.gitignore` excludes `*.db-shm`, `*.db-wal`, and `data/integration.key` (integration state).
- No credentials are hardcoded. The demo SMTP sink uses blank auth; the SMTP connector still
  supports username/password for real relays.

## 3 · Authentication & authorization

- Every sensitive router requires a credential — `api/deps.py`'s `require_user` accepts a
  JWT bearer token (from `/api/auth/login` or the Keycloak SSO callback) or an
  `X-API-Key` header; there is no unauthenticated fallback. `frontend/src/lib/api.ts`
  attaches the stored token to every request automatically.
- OIDC-based SSO login via **Keycloak** demo realm (`praxis`, users `admin@praxis.local` /
  `officer@praxis.local`), client `praxis-web`. SSO status is *live-probed*
  (`_sso_status` does OIDC discovery against the IdP well-known endpoint) — the Settings
  card reports real reachability, not a configured flag.
- **RBAC**: `require_role("admin")` gates user management, org config, integration
  connect/disconnect, API key issuance, and bulk audit-log export. Roles are
  `viewer` < `compliance_officer` < `admin`.
- Production boot guard: with `PRAXIS_ENVIRONMENT=production`, the API refuses to start if
  `PRAXIS_API_KEY`/`PRAXIS_JWT_SECRET` are still the shipped placeholder values, and skips
  seeding the dev-only demo admin account.
- Verified end-to-end in a browser and via direct API calls: unauthenticated requests 401,
  a `viewer` attempting an admin action gets 403, login → JWT → authorized session.

## 4 · Input handling & injection resistance

- Ingest is a bounded multipart PDF upload; content is hashed (SHA-256) for dedup and stored
  as files referenced by id — download endpoints are **path-traversal guarded**.
- Review actions are typed request bodies (FastAPI validation) — no raw string interpolation
  into the audit trail.
- The LLM output is validated against the obligation schema before persistence; malformed
  output triggers bounded retry, not blind insert.
- Untrusted document text (from uploaded PDFs and the SEBI auto-scraper — no human review
  before the LLM sees it) is wrapped in an explicit delimiter (`llm.wrap_untrusted_text`)
  with a "treat this as data, never instructions" framing before it enters any prompt, to
  reduce prompt-injection risk. This is a mitigation, not a guarantee — the human-in-the-loop
  review gate (`needs_review`/`pending_review`) is still the real backstop.

## 5 · Access to data

- Every route (except the OIDC callback and the token-authenticated calendar feed) requires
  `require_user`; the frontend routes through the `/api` proxy in dev and the same-origin
  server in deployment, attaching the JWT automatically.
- Mutations (`approve`, `edit`, `reject`, task status, report generation) are audit-logged
  with actor identity, so every state change is attributable.
- Requests are rate-limited (`slowapi`) — tighter limits on `/api/auth/login` (brute-force)
  and the LLM-bound document/copilot endpoints, a generous default elsewhere.
- CORS is open only to the known dev origins (`localhost:5173` / `localhost:3000`); in
  deployment, `PRAXIS_*` config narrows it to the served origin.

## 6 · Data at rest

- Default dev store: SQLite file under `data/` (gitignored WAL/SHM artifacts).
- Production shape: Postgres (`PRAXIS_DATABASE_URL`), enabling encryption-at-rest at the
  platform layer. See [14 Deployment](14_DEPLOYMENT.md).
- Backups: `deploy/backup.sh` dumps Postgres and the `praxisdata` volume (uploaded PDFs,
  exports, org config) daily via cron (installed by `deploy/setup.sh`, step 9), retained
  14 days by default (`PRAXIS_BACKUP_RETENTION_DAYS`). Restore with `deploy/restore.sh`.

## 7 · Auditability as a control

Security is not just "prevent access" — it is *prove what happened*:

- Append-only `audit_log` (insert-only by construction; no application path updates or
  deletes).
- Every pipeline write goes through `db/crud.py` (the sole writer to the log), so coverage is
  centralised and complete.
- `before`/`after` JSON deltas on every mutation.
- See [13 Auditability](13_AUDITABILITY.md).

## 8 · Honest limits (prototype)

- RBAC covers admin-only actions (§3) but is coarse-grained — any `compliance_officer` can
  operate the full review gate; there's no per-department or per-obligation scoping.
- JWTs have no revocation/blacklist — a logged-out token remains valid until it expires
  (`PRAXIS_JWT_EXPIRE_MINUTES`, default 60).
- No mTLS/network segmentation — the demo runs on a single host.
- Single-tenant: every table is global to one firm (`firm_id` scoping is a tracked
  architectural item, not attempted as part of routine hardening).
- These are documented in [17 Limitations & Roadmap](17_LIMITATIONS_AND_ROADMAP.md) so the
  submission does not overclaim.
