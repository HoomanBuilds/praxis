# 17 · Limitations & Roadmap

An honest accounting of what the prototype does **not** do, and the production path from here.
This is written so the submission is evaluated on what it demonstrates, not on what it
overclaims.

## Known limitations (at submission)

### Functional
- **SEBI SCORES** is a manual field, not a live API integration (no public authenticated API
  was available to the team). It participates in audit/export but does not auto-file.
- **Slack / Jira / Google Drive / DocuSign** connectors are implemented and connection-tested
  but not connected in the demo — they require the firm's own accounts (Drive OAuth client and
  DocuSign sandbox credentials were not provided).
- **Rule evaluation is generated, not executed.** Rules describe how compliance will be checked
  (`evaluation_criterion`, `threshold_value`, `is_qualitative`) but the system does not yet
  ingest live firm data to evaluate them automatically.
- **No golden-set precision/recall harness.** Accuracy today is demonstrated by provenance
  spot-checks and the human gate; a formal annotated-corpus evaluation is not yet built.

### Security / identity
- **No RBAC.** SSO authenticates users but all logged-in users can operate the review gate.
  Officer/Admin/Viewer separation is a roadmap item.
- **No mTLS / network segmentation.** The demo runs on a single host behind a dev CORS
  policy.

### Engineering
- **No migration tool.** Schema is created with `Base.metadata.create_all`; schema changes on
  SQLite mean recreating `data/praxis.db` (regenerable from the corpus). Alembic is planned
  for Postgres.
- **SQLite default in dev** — Postgres is supported (`PRAXIS_DATABASE_URL`) but not the default
  path in the demo.
- **No multi-tenancy.** One firm's data model.

## Design decisions that look like limitations but are intentional

| Looks like | Actually |
|---|---|
| "Only ~18 LLM calls for 870 sections" | The funnel deliberately reserves the LLM for content that needs it — cost/latency control is a feature |
| "No auto-approve" | The human gate is structural; autonomy here would be the anti-feature |
| "Graph is a projection, not Neo4j" | Single auditable source of truth; swapping the store later does not change callers |
| "SCORES is manual" | We refuse to fake a live integration we cannot authenticate |
| "Local LLM only" | Regulatory content never leaves the client boundary — the headline privacy control |

## Roadmap

### Near term (post-TechSprint)
1. **Live rule evaluation** — connect evidence collectors to actual firm data (spreadsheets,
   APIs, DMS) and run rule evaluation with pass/fail + remediation.
2. **Real connectors** — provision firm accounts for Slack, Jira, Drive, DocuSign; wire
   evidence collection through Drive/DocuSign.
3. **SCORES integration** — track official API surface; integrate when available (still
   audit-logged, never blind-auto-filed without officer confirmation).
4. **RBAC** on top of SSO identity (admin / compliance officer / viewer) with per-role
   mutation rights enforced at the API layer.

### Medium term
5. **Golden-set evaluation harness** — annotate a corpus of circulars; CI-gate pipeline
   changes on precision/recall.
6. **Alembic migrations** — Postgres-first schema management; per-tenant schemas for
   multi-tenancy.
7. **Scheduling & digests** — periodic circular polling, weekly obligation digests via the
   email connector, calendar sync two-way.
8. **Explainable risk** — feature-level attribution for `_risk_score` so ranking is
   inspectable.

### Long term
9. **Multi-tenancy + hosting** — firm isolation, managed deployment (single CORS origin,
   serving the built frontend from the API), platform-grade encryption at rest.
10. **Graph database swap** — optional Neo4j/memgraph backend behind `kg/graph.py` for
    larger corpora.
11. **Regulator-grade export** — XBRL/JSON schemas and digital signatures on audit packages.

## How the roadmap is validated

- Backend test suite (**59 tests**) covers funnel, extraction, HITL, generation, and audit
  paths — every roadmap change keeps the suite green.
- Frontend build is CI-clean; demo harnesses exercise the review dialog, email connect, and
  SSO flows end-to-end.
- Each roadmap item maps to an existing seam (integration provider contract, CRUD/audit layer,
  KG projection boundary), so it is additive rather than a rewrite.
