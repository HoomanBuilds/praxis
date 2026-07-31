# 11 · Integrations

Integrations turn extracted obligations into *work* in the tools the firm already uses.
Each connector lives in `backend/integrations/`, exposes a uniform
`connect / test_connection / summarize` contract via `providers.py`, and surfaces live
status in the Settings page.

## Connector inventory & live status

| Connector | Status (demo) | Tier | What it does |
|---|---|---|---|
| **Email** | `connected` | Tier 1 · real | SMTP notifications from `noreply@praxis.local` via the demo SMTP sink |
| **Calendar** | `connected` | Tier 1 · real | Live ICS feed of task deadlines (subscription-ready `.ics`) |
| **SSO** | `connected` | Tier 1 · real | OIDC login via Keycloak demo realm `praxis` (users `admin@praxis.local` / `officer@praxis.local`) |
| **Slack** | `not_connected` | Tier 2 · real | Task/obligation alerts (needs a workspace token) |
| **Jira** | `not_connected` | Tier 2 · real | Task issue sync (needs an Atlassian account) |
| **Google Drive** | `not_connected` | Tier 2 · real | Evidence collector storage (needs OAuth client) |
| **DocuSign** | `not_connected` | Tier 2 · real | E-sign workflows (needs sandbox account) |
| **SEBI SCORES** | manual field | honest manual | Filing/response tracking entered by the officer (not a live API) |

### Tier notes
- **Tier 1** connectors are wired and *demonstrably connected* in the shipped demo.
- **Tier 2** connectors are fully implemented behind `PRAXIS_*` env vars but require the
  firm's own accounts; they are connection-tested, not live. Credentials were not available at
  submission (Drive OAuth client and DocuSign sandbox), so their cards honestly show
  `not_connected`.

## Connection contract

Every connector implements the same shape (`backend/integrations/providers.py`):

- `CONNECT_FIELDS` — the fields its connect form needs (e.g. host, port, from address for SMTP)
- `test_connection()` — a live verification that returns success + a human summary
- `summarize()` — a description of what the connector does for Settings display

The backend connect endpoint accepts `{"fields": {…}}`. Field requirements are enforced:
SMTP `host` + `from_address` are required; `username`/`password` are optional (the demo SMTP
sink needs no auth).

### Status semantics (honest, not cosmetic)
- A **failed first connect** leaves the card `Not connected`.
- A **previously-connected connector that fails** moves to `Error`.
- Settings renders `✓ Verified` + `Last tested:` from the last live test result — state is
  backend truth, not a UI label.

## Email

- SMTP outbound notifications to task owners (`_smtp_send` in `providers.py`).
- Demo config: host `127.0.0.1`, port `2525`, blank credentials, from `noreply@praxis.local`.
- The demo SMTP sink (`/tmp/smtp_sink.py`, stdlib `smtpd`, no auth) logs every outbound
  message to `/tmp/smtp_sink_messages.log` — judges can inspect *actual* notification
  delivery during the demo.

## Calendar

- Live **ICS feed** generated from `tasks.deadline` + status (integration + calendar views).
- Subscription-ready: point any calendar client at the feed and deadlines appear with titles
  and status.
- Deadline rendering respects `depends_on_task_id` so dependent tasks are not shown as
  schedule-valid while predecessors are open.

## SSO

- OIDC discovery-based status (`_sso_status` in `routes_integrations.py`): the backend probes
  the IdP's well-known endpoint and reports real reachability, not a configured flag.
- Demo IdP: **Keycloak 26** (Docker, `:8081`), realm `praxis`, auto-imported from
  `data/keycloak/praxis-realm.json`, client `praxis-web`.
- Verified end-to-end in a real browser (login → authorized → session).

## Slack / Jira / Drive / DocuSign

- Implemented connectors with `PRAXIS_SLACK_*`, `PRAXIS_JIRA_*`, `PRAXIS_DRIVE_*`,
  `PRAXIS_DOCUSIGN_*` env vars (empty by default per `config.py`).
- Connect forms, field schemas, and live test hooks are wired; they go live the moment
  credentials are supplied.

## SEBI SCORES

Represented as an **honest manual field** in the compliance workflow. PRAXIS does not claim a
live SCORES API integration that does not exist; officers record the SCORES response/status,
and it is included in audit exports.

## Env vars & config

| Variable | Purpose |
|---|---|
| `PRAXIS_SMTP_HOST` / `PRAXIS_SMTP_PORT` / `PRAXIS_SMTP_USERNAME` / `PRAXIS_SMTP_PASSWORD` / `PRAXIS_SMTP_FROM` | Email |
| `PRAXIS_KEYCLOAK_URL` / realm / client | SSO |
| `PRAXIS_SLACK_TOKEN` / `PRAXIS_JIRA_*` | Slack / Jira |
| `PRAXIS_DRIVE_*` | Google Drive OAuth |
| `PRAXIS_DOCUSIGN_*` | DocuSign sandbox |

See `docs/setup-and-run.md` → Integrations for the full mapping.

## Related

- [12 Security](12_SECURITY.md) — how credentials and OAuth state are handled
- [15 Demo Guide](15_DEMO_GUIDE.md) — showing email + calendar + SSO live
