# 08 · Rules & Tasks

Phase B (generation) turns an **approved** obligation into three concrete artefacts: a
machine-evaluable rule, a workflow task with an owner and deadline, and an evidence collector.
Phase B never runs on un-approved obligations — the review gate is upstream by construction.

## Rule types

| `rule_type` | Meaning | Example |
|---|---|---|
| `deadline` | an obligation bound to a date | "File the annual compliance report by 31 March" |
| `threshold` | a numeric bound | "Maintain a net worth of at least ₹5 crore" |
| `documentation` | a policy/record that must exist | "Board-approved cyber security policy" |
| `periodic_filing` | recurring submission | "Quarterly disclosure to the exchange" |
| `process_adherence` | a procedure that must be followed | "Seek client confirmation before rebalancing" |

Each rule carries:

- `evaluation_criterion` — the plain-language test that decides compliance
- `timeline` / `threshold_value` (verbatim where present in the source)
- `is_qualitative` — when true, compliance requires human judgement, not just a data check
- `evidence_type` and `schema_json` — the full rule object, so downstream engines (and
  judges) can see the rule exactly as generated

## Task generation

For each approved obligation, Phase B:

1. Reads `data/org_config.json` for the firm's functional areas, primary owners, owner
   emails, reviewers, and workflow templates.
2. Creates one or more tasks: `title`, `description`, `functional_area`, `primary_owner`,
   `owner_email`, `reviewer`, `workflow_template`.
3. Computes the **deadline** as `effective date − implementation buffer`, so the date is
   derived and traceable to the source timeline, not arbitrary.
4. Chains dependent tasks via `depends_on_task_id` (e.g. a board-approval task must precede
   the implementation task).
5. Attaches an evidence collector (`evidence_requirements`) for the obligation — `document_type`,
   `required_content`, `collector`, `retention_period` (default **5 years**, matching SEBI
   record-keeping norms).

### Task status model

```
not_started ─► in_progress ─► completed
     └──────────────┬──────────────► overdue   (deadline passed, auto-computed)
```

`overdue` is a computed badge in the UI; operators can also filter on it, but cannot manually
set "overdue" as a status — status is either driven by the workflow or derived from the
deadline. This keeps the state machine honest.

## Deadline derivation

- Phase A records the **verbatim timeline phrase** as `obligations.deadline_hint` (e.g. "within
  60 days of the date of this circular").
- Phase B resolves it to a concrete `tasks.deadline` against the effective date and applies the
  implementation buffer from org config.
- Both the hint and the resolved date are visible on the task, so the mapping is auditable.

## Evidence collectors

Every obligation requires evidence of compliance. Collectors are described, not faked:

| Field | Purpose |
|---|---|
| `document_type` | the artefact, e.g. "Board-approved policy document" |
| `required_content` | what the artefact must demonstrate |
| `collector` | who/how it will be collected (integration, e.g. Drive/DocuSign/SCORES) |
| `retention_period` | retention window (default 5 years) |

At submission, **no evidence collector is blank** — every obligation has a defined
`document_type` and `required_content`.

## Query endpoints

| Endpoint | Returns |
|---|---|
| `GET /api/rules?obligation_id=` | rules for an obligation |
| `GET /api/tasks?obligation_id=` | tasks for an obligation |
| `GET /api/evidence?obligation_id=` | evidence requirements for an obligation |

## Related

- [09 Workflows & HITL](09_WORKFLOWS_AND_HITL.md) — where rules/tasks surface in the UI and status flow
- [06 Database Schema](06_DATABASE_SCHEMA.md) — table definitions for `rules`, `tasks`, `evidence_requirements`
