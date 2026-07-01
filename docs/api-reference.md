# API Reference

FastAPI app: `api/main.py`. Interactive docs at `/docs` (Swagger) when the server is running.
All payloads are JSON unless noted. CORS is open for `localhost:5173` / `localhost:3000`
(the forthcoming UI).

Base URL in local dev: `http://localhost:8080`.

## Health & root

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Service banner + links |
| `GET` | `/api/health` | LLM availability, corpus chunk count, Redis queue depth, model id |

## Documents

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/documents/ingest` | Upload a circular PDF (multipart `file`). Query: `reference`, `title`, `process` (bool). Stores + dedups; if `process=true` runs Phase A synchronously, else publishes to the worker queue. |
| `GET` | `/api/documents` | List all documents (newest first) |
| `GET` | `/api/documents/{id}` | One document incl. `document_type`, `funnel`, `regulatory_context` |
| `GET` | `/api/documents/{id}/file` | Download the original PDF |
| `POST` | `/api/documents/{id}/process` | Run **Phase A** (funnel + extraction) synchronously |
| `POST` | `/api/documents/{id}/generate` | Run **Phase B** (rules → workflow ∥ evidence). Query: `auto_approve` (bool) |

**Ingest response** `{ "document": {...}, "created": true, "queued": true }`
(or `"processed": {...}` when `process=true`).

**Process response** (Phase A) includes the funnel:
```json
{
  "document_id": "…", "status": "awaiting_review",
  "obligations": 48, "flagged_for_review": ["…-OB-007"],
  "parse_quality": 0.997,
  "funnel": { "total_sections": 151, "candidates": 57,
              "deterministic_sections": 40, "llm_sections": 17, "llm_calls": 18, … }
}
```

## Obligations (the human-in-the-loop gate)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/obligations` | List. Query filters: `document_id`, `status`, `functional_area` |
| `GET` | `/api/obligations/{id}` | One obligation incl. verbatim `source_text` + `extraction_method` |
| `POST` | `/api/obligations/{id}/approve` | Approve. Body: `{ "reviewer": "…", "note": "…" }` |
| `POST` | `/api/obligations/{id}/reject` | Reject. Body: `ReviewAction` |
| `PATCH` | `/api/obligations/{id}` | Edit. Body: `{ "description"?, "functional_area"?, "modification_type"? }` |

Every approve/reject/edit is recorded in the append-only audit log.

## Rules · Tasks · Evidence

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/rules` | Query: `obligation_id` |
| `GET` | `/api/tasks` | Query: `obligation_id` |
| `GET` | `/api/evidence` | Query: `obligation_id` |

## Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary` | Compliance score, obligation/task counts by status and functional area, totals, audit-log size |

```json
{
  "compliance_score": 82, "total_obligations": 1248,
  "pending_review": 173, "approved": 1023,
  "obligations_by_functional_area": { "operations": 412, … },
  "total_rules": 1023, "total_tasks": 1041, "tasks_by_status": { … },
  "audit_log_entries": 5120
}
```

## Audit

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/audit/report` | Build an audit package. Body: `{ "scope": "obligation\|document\|firm", "obligation_id"?, "document_id"?, "formats": ["pdf","xlsx"] }`. Returns the package + downloadable filenames |
| `GET` | `/api/audit/download/{filename}` | Download a generated report (path-traversal guarded) |

## Knowledge graph

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/knowledge-graph` | `{nodes, edges, stats}`. Query: `document_id` to scope |
| `GET` | `/api/knowledge-graph/export.graphml` | GraphML export. Query: `document_id` |

See [knowledge-graph.md](knowledge-graph.md).

## Typical sequence

```
POST /api/documents/ingest?process=true        → document_id, funnel
GET  /api/obligations?document_id=…&status=pending_review
POST /api/obligations/{id}/approve             (repeat / PATCH to edit / reject)
POST /api/documents/{id}/generate              → rules, tasks, evidence
GET  /api/tasks?obligation_id=…
POST /api/audit/report  {scope:"document", document_id:…}
GET  /api/knowledge-graph?document_id=…
```
