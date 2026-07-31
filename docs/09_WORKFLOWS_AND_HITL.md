# 09 · Workflows & HITL

This document describes how the human-in-the-loop gate, status model, and dashboards combine
into an operator workflow — and how PRAXIS keeps the human *in control* rather than merely *in
the loop*.

## The review gate (Phase A → B)

Nothing the agent produces becomes authoritative on its own. The flow:

```
proposed obligations (pending_review)
        │
        ├── approve   ──► approved ──► eligible for Phase B
        ├── edit      ──► edited   ──► audited delta → eligible for Phase B
        └── reject    ──► rejected ──► never generates rules/tasks
```

- Low-confidence extractions (`confidence < 0.65`) are flagged `needs_review` and sort to the
  top of the queue so human attention concentrates where the model is least sure.
- Every action records the reviewer identity, timestamp, and `before/after` delta in the
  append-only audit log.
- Batch approve/triage keeps a 100+ obligation circular manageable without weakening the gate.

## Document status lifecycle

```
ingested ─► extracting ─► awaiting_review ─► generating ─► completed
                     ▲                     │
                     └── edit/reject       └──► needs_human_parse / failed
```

`awaiting_review` is a first-class state: the document is *stuck on the human*, which is the
intended behaviour. The dashboard reports how many documents sit at the gate.

## Task workflows

Operators move tasks `not_started → in_progress → completed`. Overdue is **derived** from the
deadline (and shown as a computed badge), never hand-set — so "overdue" always means what it
says. Dependency chains (`depends_on_task_id`, e.g. board-approval before implementation) are
respected by the Calendar view so a task cannot be shown as schedule-valid while its
predecessor is open.

## Dashboard summary

`GET /api/dashboard/summary` powers the landing view:

```json
{
  "compliance_score": 82,
  "total_obligations": 1248,
  "pending_review": 173,
  "approved": 1023,
  "obligations_by_functional_area": { "operations": 412, "…": "…" },
  "total_rules": 1023,
  "total_tasks": 1041,
  "tasks_by_status": { "…": "…" },
  "audit_log_entries": 5120
}
```

The compliance score is computed from approved/total obligations and task completion — it
answers "how compliant are we, in one number" while the underlying drill-downs stay visible.

## Risk Register

The Risk Register ranks obligations by a deterministic `_risk_score` (shared with the
knowledge graph — see [07 Knowledge Graph](07_KNOWLEDGE_GRAPH.md#risk-scoring)). Because both
views call the same scorer, the risk chip on an obligation in the Knowledge Graph view and its
ranking in the Risk Register always agree.

## Areas & attribution

All seven functional areas are derived from `data/org_config.json` via a shared frontend hook
(`useAreas()`), so the Departments view lists real departments and every obligation/task
carries a real `primary_owner`. At submission, **all 7 areas have at least one obligation with
a primary owner** — the dashboard is not padded with empty categories.

## Pages that surface the workflow

| Page | Purpose |
|---|---|
| Dashboard | compliance score, counts by status/area, task funnel |
| Documents | ingest + per-document status and funnel telemetry |
| Obligations / Review | the HITL queue — approve / edit / reject with provenance |
| Tasks / Calendar | owner, deadline, dependency, status, overdue badge |
| Risk Register | deterministic risk ranking |
| Departments | obligations and owners by functional area |
| Knowledge Graph | visual query of regulation → obligation → task → evidence |
| Audit | audit-log trail and report generation |

## Guardrails

- No `auto-approve` in the agent core (demo-safe by construction).
- `overdue` cannot be set manually; it is computed.
- Phase B rejects un-approved obligations at the data layer, not just in the UI.
- The audit log is the source of truth for "who decided what, when" — see
  [13 Auditability](13_AUDITABILITY.md).
