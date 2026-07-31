# 10 · Frontend Architecture

The operator console is a React + TypeScript + Vite single-page application under
`frontend/`. It is the *evidence surface* for Demo Day: every claim in the docs is visible in
the UI.

## Stack & tooling

| Concern | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build / dev server | Vite (dev server `:5173` proxies `/api` → `:8080`) |
| Data fetching | TanStack React Query (server state, caching, invalidation) |
| Styling | Tailwind CSS + `cn()` class-merge utility |
| Icons | Lucide |
| UI primitives | `frontend/src/components/ui/` (dialog, select, badge, card, button, …) |

## Pages

| Page | Route | Purpose |
|---|---|---|
| Dashboard | `/` | compliance score, obligation/task counts by status & functional area |
| Documents | `/documents` | ingest, list, per-document status + funnel telemetry |
| Obligations | `/obligations` | filterable list with provenance (`source_text`, paragraph ref) |
| Review | `/review` | the HITL queue — approve / edit / reject |
| Tasks | `/tasks` | owner, deadline, status, dependency |
| Calendar | `/calendar` | tasks on a timeline with derived overdue badges |
| Risk Register | `/risk-register` | deterministic risk ranking |
| Departments | `/departments` | obligations/owners by functional area (real org config) |
| Knowledge Graph | `/knowledge-graph` | regulation → obligation → task → evidence, risk chips |
| Audit | `/audit` | audit log + report generation |
| Settings | `/settings` | integration cards with live status (✓ Verified + Last tested) |

## Key design patterns

### `useAreas()` — single source of truth for org structure
The hook (`frontend/src/hooks/useAreas.ts`) fetches `/api/org-config/functional-areas` and
falls back to the `AREAS` constant while loading. Calendar, Obligations, Review, and Risk
Register all consume it, so functional-area options come from the backend's
`data/org_config.json` — no hardcoded department list to drift.

### Status rendering honesty
- `overdue` is **derived**: it exists as a filter and a computed badge; the status Select in
  the Calendar drill-down excludes it as a settable value, and a genuinely overdue task renders
  a disabled "Overdue (auto)" chip. The UI cannot lie about task state.
- Integration cards show `✓ Verified` plus a `Last tested:` timestamp from the backend's live
  connection test, not a hardcoded "connected".

### React Query
Server data is fetched/invalidated via React Query. After approve/edit/reject or task status
changes, the relevant queries are invalidated so dashboard, calendar, and register views
reconcile without manual refresh.

### Utility conventions
`titleCase()` for display labels, `cn()` for conditional class merging, consistent dialog/select
primitives for review actions.

## Frontend ↔ backend contract

All data flows through the FastAPI REST API (`/api/…`). Key endpoints the UI calls:
`/api/documents`, `/api/obligations` (+ approve/reject/PATCH), `/api/tasks`,
`/api/dashboard/summary`, `/api/knowledge-graph`, `/api/audit/report`,
`/api/integrations/*`, `/api/org-config/functional-areas`. Full contract in
[api-reference.md](api-reference.md).

## Accessibility & polish notes

- Dialogs are used for approve/reject/edit with reviewer identity capture — matching the
  audit requirements in [13 Auditability](13_AUDITABILITY.md).
- Empty/loading states use the shared `AREAS` fallback so no page flickers on first paint.
- The build is clean (`npm run build` passes) and there are no console errors in the demo
  harness runs.

## Related

- [02 System Architecture](02_SYSTEM_ARCHITECTURE.md) — where the frontend sits in the stack
- [15 Demo Guide](15_DEMO_GUIDE.md) — scripted tour of these pages
