# 06 · Database Schema

The relational store (`backend/db/models.py`) is the compliance **system of record**
(proposal §5.2.3, §10.3). It is Postgres-first but type-portable (JSON, String, Date), so the
same SQLAlchemy 2.x models run on SQLite for no-Docker development and Postgres in production.
`db/session.py` builds the engine/sessions; `db/crud.py` centralises all writes and audit
logging. **No application code writes to the ORM directly** — it goes through CRUD, which is
what makes audit coverage complete.

## Entity relationships

```
documents 1───* obligations 1───* rules
                   │ 1───* tasks
                   │ 1───* evidence_requirements
                   └ linked_prior_obligation_id ──► obligations   (cross-doc supersession)

section_fingerprints   keyed by (family_key, section_label)   — incremental diff
audit_log              append-only, references any resource by id
```

## Tables

### `documents`
The ingested regulatory instrument and its processing state.

| Column | Type | Notes |
|---|---|---|
| `id` | str (uuid) | PK |
| `reference`, `title`, `source_url`, `file_path` | str | |
| `content_hash` | str | SHA-256 of the file; dedup key |
| `status` | str | ingested → extracting → awaiting_review → generating → completed (or needs_human_parse / failed) |
| `parse_quality`, `used_ocr`, `page_count` | float/bool/int | from the parser |
| `document_type` | str | circular \| master_circular |
| `family_key` | str | groups successive releases for diffing |
| `regulatory_context` | JSON | Regulation Extraction output |
| `funnel` | JSON | per-run funnel stats (see [04 AI Pipeline](04_AI_PIPELINE.md)) |
| `error` | text | failure / flag reason |
| `ingested_at`, `processed_at` | datetime | |

### `obligations`
A discrete compliance duty with provenance and review status.

| Column | Type | Notes |
|---|---|---|
| `id` | str (uuid) | PK |
| `document_id` | FK → documents | |
| `identifier` | str | human code, e.g. `129C0318-OB-001` |
| `description` | text | plain-language duty |
| `source_text` | text | **verbatim** source quote (provenance) |
| `source_paragraph_ref` | str | section label in the circular |
| `functional_area` | str | operations / technology / compliance / legal / finance / client_services / human_resources |
| `modification_type` | str | new / modifies / supersedes / clarifies |
| `confidence` | float | calibrated 0–0.98 |
| `deadline_hint` | str | verbatim timeline phrase |
| `linked_prior_obligation_id` | str | cross-reference link |
| `extraction_method` | str | deterministic \| llm |
| `status` | str | pending_review / approved / rejected / edited |
| `needs_review` | bool | true when `confidence < 0.65` |
| `reviewer`, `reviewed_at` | str/datetime | set at the human gate |

### `rules`
A machine-evaluable rule generated from an approved obligation (Phase B).

| Column | Type | Notes |
|---|---|---|
| `id` | str (uuid) | PK |
| `obligation_id` | FK → obligations | |
| `rule_type` | str | deadline / threshold / documentation / periodic_filing / process_adherence |
| `evaluation_criterion`, `timeline`, `threshold_value` | str | `threshold_value` is verbatim or null |
| `is_qualitative` | bool | true → human judgement |
| `evidence_type` | str | |
| `schema_json` | JSON | full rule object |

### `tasks`
A workflow task assigned to a functional owner (Phase B).

| Column | Type | Notes |
|---|---|---|
| `id` | str (uuid) | PK |
| `obligation_id` | FK; `rule_id` | str |
| `title`, `description` | str/text | |
| `functional_area`, `primary_owner`, `owner_email`, `reviewer`, `workflow_template` | str | from `org_config.json` |
| `deadline` | date | effective date − implementation buffer |
| `status` | str | not_started / in_progress / completed / overdue |
| `depends_on_task_id` | str | dependency chain (e.g. board-approval task) |

### `evidence_requirements`
The artefacts that demonstrate compliance (Phase B).

| Column | Type |
|---|---|
| `id` (PK), `obligation_id` (FK) | str |
| `document_type`, `required_content`, `collector` | str/text |
| `retention_period` | str (default "5 years") |

### `section_fingerprints`
Per-section content hashes for the incremental diff engine.

| Column | Type | Notes |
|---|---|---|
| `id` | int | PK |
| `family_key` | str | indexed; groups document releases |
| `section_label` | str | section identity within a family |
| `content_hash` | str | SHA-256 of normalised section text |
| `document_id`, `heading`, `updated_at` | str/str/datetime | |

Diff key: `(family_key, section_label) → content_hash`.

### `audit_log`
Append-only trail — inserts only; never updated or deleted in application code.

| Column | Type | Notes |
|---|---|---|
| `id` | int | PK |
| `action` | str | e.g. obligation.extracted, obligation.approved, rule.generated, task.assigned, audit_report.generated |
| `actor` | str | system component or reviewer |
| `resource_type`, `resource_id` | str | the affected entity |
| `before`, `after` | JSON | state delta |
| `timestamp` | datetime | indexed |

## Consistency rules the codebase enforces

- Every mutating helper in `db/crud.py` writes an `audit_log` row (`record_audit`) — centralised
  and complete by construction.
- `extraction_method`, `confidence`, and `source_text` are always populated at creation; the
  review UI cannot show an obligation without provenance.
- Task `deadline` is derived (effective date − implementation buffer) so it is traceable to the
  source timeline rather than arbitrary.
- `section_fingerprints` are append-only per family; re-processing replaces hashes for changed
  sections but never mutates history.

## Schema management

`db/session.py:init_db()` runs `Base.metadata.create_all` (idempotent) on startup, which is
enough for a fresh dev SQLite database. Schema changes ship as Alembic migrations
(`backend/alembic/`) — `alembic upgrade head` runs before the API starts in production
(`docker-compose.prod.yml`); the pre-Alembic columns are still applied via `session.py`'s
`_NEW_COLUMNS` for backward compatibility, but new changes go through Alembic only.
