# 15 · Demo Guide

A ~15-minute, scripted Demo Day walkthrough. Each step names the page and the evidence it
produces. Run the deployment from [14 Deployment](14_DEPLOYMENT.md) first; have the backend,
frontend, and SMTP sink running.

## Setup checklist

- [ ] Backend up: `http://localhost:8080` (`/api/health` returns LLM availability + model id)
- [ ] Frontend up: `http://localhost:5173`
- [ ] SMTP sink running (`/tmp/smtp_sink.py`), log tailing
- [ ] Sample circular PDF available (e.g. a master circular; the 414-page / 870-section case)
- [ ] Keycloak up (for SSO step)

## Step 1 — Ingest a circular (2 min)

**Page:** Documents
- Upload a circular PDF (`reference`, `title`, `process=true`).
- Show the **process response**: status `awaiting_review`, obligation count,
  `parse_quality`, and the **funnel** — `total_sections`, `candidates`,
  `deterministic_sections`, `llm_sections`, `llm_calls`.
- **Pitch line:** *"On the master circular this is 151 candidate sections → 40
  deterministic, 17 LLM — about 18 model calls for an 870-section document, not 800+."*

## Step 2 — The funnel is honest (1 min)

**Page:** Documents → funnel JSON
- Point at `llm_calls` and the deterministic/LLM split. Explain that the classifier and
  fingerprint diff are what make this cheap, and that savings are *recorded per run*, not
  claimed.

## Step 3 — Review gate (3 min)

**Page:** Review / Obligations
- Filter to the new document; note `flagged_for_review` (the `confidence < 0.65` ones sort
  first).
- Open an obligation: show **verbatim `source_text`** + paragraph ref + `extraction_method` +
  `confidence`.
- Approve one, edit one (change functional area), reject one.
- **Pitch line:** *"Nothing becomes a rule, task, or evidence requirement until an officer
  approves it. The gate is a graph node, not a UI flag."*

## Step 4 — Generate & track (2 min)

**Page:** Documents → Generate (Phase B)
- Run `generate`; then show Tasks for an approved obligation: title, `primary_owner`,
  owner email, reviewer, `workflow_template`, **deadline** (trace to the verbatim
  `deadline_hint`), dependency, status.
- Open Evidence: `document_type`, `required_content`, `collector`, `retention_period`
  (5 years). Note that no collector is blank.
- Show a rule: `rule_type`, `evaluation_criterion`, `is_qualitative`, `schema_json`.

## Step 5 — Dashboard & risk (2 min)

**Page:** Dashboard → Risk Register → Departments
- Compliance score + counts by status/area; `audit_log_entries` ticking up.
- Risk Register ranking (deterministic `_risk_score`, shared with KG).
- Departments: all 7 areas populated with real `primary_owner`s.

## Step 6 — Knowledge graph (2 min)

**Page:** Knowledge Graph
- Browse regulation → obligation → department → task → owner → evidence.
- Filter by document; export **GraphML** and open it in a graph tool (or describe it).
- **Pitch line:** *"279 obligations, 279 risk nodes, 604 total nodes — and because it's a
  projection over the relational store, it can never disagree with the audit trail."*

## Step 7 — Live integrations (3 min)

**Page:** Settings
- **Email:** trigger a notification; show the SMTP sink log
  (`/tmp/smtp_sink_messages.log`) with the actual message from `noreply@praxis.local`.
- **Calendar:** subscribe to the ICS feed; show the task deadline on a calendar.
- **SSO:** sign out → Sign in → Keycloak login (`officer@praxis.local` / `officer123`) →
  back in with session established. Card shows live `✓ Verified` + `Last tested:`.
- Slack/Jira/Drive/DocuSign cards honestly show `not_connected` — say why (need the firm's
  accounts) and that wiring + connection tests are complete.

## Step 8 — Audit & export (2 min)

**Page:** Audit
- Filter by actor/resource; show `before`/`after` deltas on the edited obligation.
- `POST /api/audit/report` scope `document`, formats `pdf` + `xlsx`; download and open.
- **Pitch line:** *"Every obligation traces to a verbatim source paragraph, and every
  decision to a named reviewer with a timestamp. The export is the regulator-ready record."*

## Optional — Incremental update (2 min)

Re-upload a *revised* version of the same circular family. Show that unchanged obligations are
untouched and only diffed sections re-process; point to the `MODIFIES` edge in the graph for a
superseded obligation.

## Talking points if time is short

1. Scale-aware funnel: 85–90% fewer LLM calls with full obligation coverage.
2. Human gate is structural — no auto-approve anywhere in the agent core.
3. Local-first LLM: regulatory content never leaves the boundary.
4. Append-only audit log + verbatim provenance + regulator-ready export.
5. Cross-document intelligence: `MODIFIES` edges show obligation evolution across circulars.
