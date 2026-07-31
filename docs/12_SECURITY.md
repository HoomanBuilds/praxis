# 12 · Security

PRAXIS handles a firm's regulatory corpus — sensitive by nature. The security posture is
**local-first, least-privilege, and audit-backed**.

## 1 · Local-first LLM (the headline control)

- The LLM runs **locally via Ollama** (default `qwen2.5:7b`). Regulatory content **never
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

## 3 · Authentication (SSO)

- OIDC-based login via **Keycloak** demo realm (`praxis`, users `admin@praxis.local` /
  `officer@praxis.local`), client `praxis-web`.
- SSO status is *live-probed* (`_sso_status` does OIDC discovery against the IdP well-known
  endpoint) — the Settings card reports real reachability, not a configured flag.
- Verified end-to-end in a browser: login → authorization code → established session.

## 4 · Input handling & injection resistance

- Ingest is a bounded multipart PDF upload; content is hashed (SHA-256) for dedup and stored
  as files referenced by id — download endpoints are **path-traversal guarded**.
- Review actions are typed request bodies (FastAPI validation) — no raw string interpolation
  into the audit trail.
- The LLM output is validated against the obligation schema before persistence; malformed
  output triggers bounded retry, not blind insert.

## 5 · Access to data

- Read routes require the (SSO-authenticated) session; the frontend routes through the `/api`
  proxy in dev and the same-origin server in deployment.
- Mutations (`approve`, `edit`, `reject`, task status, report generation) are audit-logged
  with actor identity, so every state change is attributable.
- CORS is open only to the known dev origins (`localhost:5173` / `localhost:3000`); in
  deployment, `PRAXIS_*` config narrows it to the served origin.

## 6 · Data at rest

- Default dev store: SQLite file under `data/` (gitignored WAL/SHM artifacts).
- Production shape: Postgres (`PRAXIS_DATABASE_URL`), enabling encryption-at-rest at the
  platform layer and centralised backup. See [14 Deployment](14_DEPLOYMENT.md).

## 7 · Auditability as a control

Security is not just "prevent access" — it is *prove what happened*:

- Append-only `audit_log` (insert-only by construction; no application path updates or
  deletes).
- Every pipeline write goes through `db/crud.py` (the sole writer to the log), so coverage is
  centralised and complete.
- `before`/`after` JSON deltas on every mutation.
- See [13 Auditability](13_AUDITABILITY.md).

## 8 · Honest limits (prototype)

- **No role-based access control** beyond SSO identity at submission time (reviewer/officer
  distinction is a roadmap item). All logged-in users can operate the review gate.
- No mTLS/network segmentation — the demo runs on a single host.
- These are documented in [17 Limitations & Roadmap](17_LIMITATIONS_AND_ROADMAP.md) so the
  submission does not overclaim.
