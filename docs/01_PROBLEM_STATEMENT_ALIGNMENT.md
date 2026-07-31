# 01 · Problem Statement Alignment

**PS2 — Agentic Compliance.** The problem statement asks for a system that can autonomously
read regulatory instruments (SEBI circulars), detect the obligations they create, classify and
attribute them to the right business function, and carry them through to actionable tasks and
evidence of compliance — while keeping a human in control and the whole thing auditable.

This document restates each requirement in terms of the **PRAXIS** implementation and tells a
judge exactly where to verify it.

## Requirement → Implementation → Verification

| # | PS2 requirement | Implementation in PRAXIS | Where to verify |
|---|---|---|---|
| 1 | **Ingest regulatory documents** (PDF circulars) | `POST /api/documents/ingest` accepts a circular PDF, dedups by SHA-256 content hash, parses text (with OCR fallback), stores it, and can trigger processing synchronously or via the worker queue. | [05 Document Processing](05_DOCUMENT_PROCESSING.md); live demo step 1 in [15 Demo Guide](15_DEMO_GUIDE.md) |
| 2 | **Agentically extract obligations** | LangGraph 2-phase pipeline. Phase A runs the processing funnel (document-type classification → section filtering → fingerprint diff → rule extractor) and extracts discrete obligations with verbatim `source_text` provenance, functional-area attribution, modification type, deadline hint, and a calibrated confidence score. | [03 Agent Architecture](03_AGENT_ARCHITECTURE.md), [04 AI Pipeline](04_AI_PIPELINE.md); `backend/api/routes_documents.py` |
| 3 | **Classify / attribute obligations to business functions** | Every obligation is tagged with one of the firm's 7 functional areas (`operations`, `technology`, `compliance`, `legal`, `finance`, `client_services`, `human_resources`) drawn from `data/org_config.json`, and every task gets a `primary_owner`. | `obligations.functional_area` in [06 Database Schema](06_DATABASE_SCHEMA.md); Departments page in [10 Frontend Architecture](10_FRONTEND_ARCHITECTURE.md) |
| 4 | **Human-in-the-loop review gate** | Obligations land as `pending_review`. Officers approve / reject / edit each one; nothing is used downstream until approved. Low-confidence extractions (<0.65) are flagged `needs_review` by default. | [09 Workflows & HITL](09_WORKFLOWS_AND_HITL.md) |
| 5 | **Generate actionable tasks** | On approval (Phase B), each obligation generates rules, workflow tasks with owner, deadline (effective date − implementation buffer), dependency chain, and status model; evidence collectors are attached to each obligation. | [08 Rules & Tasks](08_RULES_AND_TASKS.md) |
| 6 | **Track compliance and evidence** | Dashboard surfaces compliance score, obligations/tasks by status and functional area; Risk Register ranks obligations by a deterministic `_risk_score`; evidence requirements list the artefact, required content, and collector for each obligation. | [09 Workflows & HITL](09_WORKFLOWS_AND_HITL.md); Risk Register page |
| 7 | **Auditability / explainability** | Append-only `audit_log` records every mutation (ingest, extract, approve, edit, reject, rule/task generation, report). Every obligation carries verbatim `source_text` and a paragraph reference; rule objects include an evaluation criterion and schema. | [13 Auditability](13_AUDITABILITY.md) |
| 8 | **Cross-document / temporal awareness** | Fingerprint-based diff engine processes only changed sections on circular updates; `MODIFIES` edges in the knowledge graph link superseding obligations across circulars. | [07 Knowledge Graph](07_KNOWLEDGE_GRAPH.md), [05 Document Processing](05_DOCUMENT_PROCESSING.md) |
| 9 | **Integrations for workflow** | Email (SMTP notifications, live-connected), calendar (Live ICS feed), SSO (Keycloak demo realm, live-connected), plus Slack, Jira, Google Drive, and DocuSign connectors with verified connection state surfaced in Settings. | [11 Integrations](11_INTEGRATIONS.md) |
| 10 | **Data security / privacy** | Local-first LLM (Ollama): regulatory content never leaves the client boundary. Secrets via environment, SSO for authentication, guarded report downloads, open CORS only to dev origins. | [12 Security](12_SECURITY.md) |

## The three headline claims

1. **Scale-aware automation.** The funnel (document-type → section classifier → fingerprint
   diff → rule extractor) decides *what actually needs an LLM*. On a 414-page / 870-section
   master circular it runs ~18 LLM calls, not 800+ — a ~85–90% reduction — without losing
   obligations.
2. **Nothing authoritative without a human.** Extraction is a *proposal*. Only explicit
   officer approval promotes an obligation to rules, tasks, and evidence. The audit log is the
   immutable record of that promotion.
3. **Local, private, auditable.** The entire regulatory corpus is processed and stored on
   infrastructure the firm controls; the LLM runs locally; every decision has provenance.

## Honest scope boundaries

These are stated openly so judges can evaluate the prototype fairly. See
[17 Limitations & Roadmap](17_LIMITATIONS_AND_ROADMAP.md) for details.

- The SEBI **SCORES** filing integration is represented as an honest manual field, not a live
  integration.
- Not all connectors (Slack, Jira, Drive, DocuSign) are connected in the demo — they need the
  firm's own accounts; their wiring is complete and connection-tested.
- Rule evaluation is generated, not yet executed against live evidence streams.
- Multi-tenancy, RBAC granularity, and a proper migration tool are roadmap items.
