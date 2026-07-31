# 13 · Auditability

For a compliance product, *the audit trail is the product*. PRAXIS is designed so that every
claim — "this obligation exists," "this officer approved it," "this task was generated," "this
evidence is required" — has an immutable, exported record.

## The append-only audit log

`audit_log` (see [06 Database Schema](06_DATABASE_SCHEMA.md)):

| Column | Meaning |
|---|---|
| `action` | e.g. `document.ingested`, `obligation.extracted`, `obligation.approved`, `rule.generated`, `task.assigned`, `audit_report.generated` |
| `actor` | the system component **or** the named reviewer who acted |
| `resource_type` / `resource_id` | the affected entity |
| `before` / `after` | JSON state delta |
| `timestamp` | indexed |

**Insert-only by construction.** There is no application path that updates or deletes audit
rows. Centralisation is structural: the pipeline never writes the ORM directly — everything
goes through `db/crud.py`, which calls `record_audit` on every mutation. A typical processed
circular yields rows for ingestion, each obligation extraction, each approval/edit, each rule
and task, and each report generation.

## Provenance at the entity level

Every obligation carries its own evidence of origin, independent of the log:

- `source_text` — the **verbatim** quote from the circular
- `source_paragraph_ref` — the section it came from
- `extraction_method` — deterministic or llm
- `confidence` — calibrated 0–0.98
- `deadline_hint` — the verbatim timeline phrase

So a judge can go obligation → source paragraph → original PDF without trusting anything the
pipeline says on faith.

## Review actions are audited, not just recorded

- `approve` / `reject` / `edit` each capture the reviewer's identity and a state delta.
- An **edit** is an audited *agent action*: the system records the change, then regenerates
  downstream artefacts — so "what was originally proposed" vs. "what the human changed" is
  recoverable.
- Task status changes and report generation are audited the same way.

## Evidence chains

- Every obligation maps to `evidence_requirements` (document type, required content,
  collector, retention period).
- No collector is blank at submission — the system refuses to produce an obligation with no
  defined compliance artefact.
- Evidence → obligation → source paragraph → circular is a complete chain in the knowledge
  graph (`ev:…` nodes, `REQUIRES` edges).

## Export & report generation

`POST /api/audit/report` builds an audit package:

- **scope**: `obligation` | `document` | `firm`
- **formats**: `pdf` | `xlsx`
- Returns the package plus downloadable filenames; `GET /api/audit/download/{filename}`
  serves them (**path-traversal guarded**).

This is the "export for the regulator" story: a firm can hand over an immutable record of how
each obligation was identified, reviewed, and operationalised.

## Graph-consistent by projection

Because the knowledge graph is a projection over the same relational store, the graph can
never show a node/edge that the audit trail does not support (see
[07 Knowledge Graph](07_KNOWLEDGE_GRAPH.md)). The system of record and the visualisation are
the same data.

## The dashboard number

`GET /api/dashboard/summary` reports `audit_log_entries` — the running size of the trail is
visible to operators and judges alike (a live corpus shows thousands of entries).

## Related

- [12 Security](12_SECURITY.md) — auditability as a security control
- [15 Demo Guide](15_DEMO_GUIDE.md) — live walkthrough of the audit page and export
