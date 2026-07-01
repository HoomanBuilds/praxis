# PRAXIS / RegPilot

**An agentic compliance platform for India's securities market** — SEBI Securities Market
TechSprint 2026, Problem Statement 2 (Agentic Compliance).

PRAXIS ingests SEBI circulars and runs them through a LangGraph-orchestrated multi-agent
pipeline that turns regulatory text into **discrete, provenance-linked compliance
obligations → machine-evaluable rules → assigned workflow tasks → audit-ready evidence
packages** — with human-in-the-loop review gates at every consequential step. The language
model runs **locally via Ollama**, so no regulatory content leaves the client boundary.

> This repository implements **Milestone 1 — the backend AI pipeline** (proposal §14.2),
> driven via REST + CLI. The React review/dashboard UI is the next milestone.

It is **scale-aware**: a deterministic pre-processing funnel (classify → diff → rule-based
extraction) reserves the LLM for the ~10–20% of content that needs reasoning, cutting model
calls on real SEBI master circulars by **~85–90%** (151-section doc: ~130 → 18 calls;
870-section doc: ~629 → 72 calls).

📚 **Full documentation is in [`docs/`](docs/README.md)** — architecture, the processing
funnel, agents, knowledge graph, data model, API reference, and setup.

---

## What's implemented

| Capability | Proposal § | Module |
|---|---|---|
| Document Parser Agent (pdfplumber + OCR fallback, structure, cross-refs, parse-quality) | 6.2.1 | `agents/parser.py` |
| Regulation Extraction Agent (RAG context, intermediary class, mode, effective date) | 6.2.2 | `agents/regulation_extraction.py` |
| Obligation Extraction Agent (structured LLM, verbatim provenance, confidence) | 6.2.3 | `agents/obligation_extraction.py` |
| Rule Generation Agent (5 rule types, qualitative handling) | 6.2.4 | `agents/rule_generation.py` |
| Workflow Mapping Agent (owners, deadlines, dependency chains) | 6.2.5 | `agents/workflow_mapping.py` |
| Evidence Mapping Agent (evidence templates per rule type) | 6.2.6 | `agents/evidence_mapping.py` |
| Audit Report Agent (PDF + XLSX evidence package) | 6.2.8 | `agents/audit_report.py` |
| Scale-aware funnel (doc-type detection, candidate filter, fingerprint+diff, hybrid extraction) | 5.1, 7.1 | `preprocessing/` |
| Compliance knowledge graph (projection + GraphML export) | 5.2.3 | `kg/graph.py` |
| RAG pipeline (structure-aware chunking, mpnet embeddings, ChromaDB, hybrid+RRF) | 7 | `rag/` |
| LangGraph orchestration (2-phase, HITL gate, conditional + parallel edges) | 6.1, 11.2 | `graph/pipeline.py` |
| Human-in-the-loop review gate (approve / edit / reject) | 10.5, 7.7 | `services.py`, API |
| Append-only audit log | 10.3 | `db/crud.py` |
| Redis Streams ingestion + worker | 5.2.1, 11.2 | `ingestion/` |
| FastAPI surface + compliance dashboard summary | 5.2.4 | `api/` |

The pipeline is split into two phases to enforce the proposal's hard HITL constraint:

```
Phase A (extraction):  parse → regulation-extraction → obligation-extraction
                       └─> obligations land "pending_review"
        ── HUMAN GATE: approve / edit / reject via REST or CLI ──
Phase B (generation):  rule-generation → (workflow-mapping ∥ evidence-mapping)
                       └─> rules / tasks / evidence (only for approved obligations)
Audit Report:          on demand → traceable PDF + XLSX evidence package
```

## Tech stack

LangGraph · LangChain · **Ollama (`llama3.1:8b`)** · sentence-transformers
(`all-mpnet-base-v2`) · ChromaDB · BM25 + Reciprocal Rank Fusion · FastAPI · SQLAlchemy
(SQLite locally / **PostgreSQL 16** in Docker) · Redis Streams · pdfplumber · Tesseract ·
reportlab/openpyxl.

---

## Quick start (no Docker — CLI demo)

Prerequisites: Python 3.11, and Ollama running with the model pulled:

```bash
ollama pull llama3.1:8b        # the local compliance model
```

Then:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 1. Build the synthetic SEBI corpus PDFs and index them
python data/seed/build_pdfs.py
PYTHONPATH=backend python -m cli index-corpus

# 2. Run the whole pipeline on one circular (ingest → extract → review → generate → audit)
PYTHONPATH=backend python -m cli run data/corpus/cyber_security.pdf --auto-approve
```

Step through it manually instead:

```bash
export PYTHONPATH=backend
python -m cli health
python -m cli ingest data/corpus/margin_pledge.pdf       # -> <document_id>
python -m cli process <document_id>                      # Phase A
python -m cli obligations <document_id>                  # inspect provenance
python -m cli approve <obligation_id>                    # HITL gate
python -m cli generate <document_id> --auto-approve      # Phase B
python -m cli audit --document <document_id>             # PDF + XLSX -> data/exports/
```

## Run the API (no Docker)

```bash
PYTHONPATH=backend uvicorn api.main:app --reload --port 8080
# Swagger UI: http://localhost:8080/docs
```

Key endpoints: `POST /api/documents/ingest` · `POST /api/documents/{id}/process` ·
`GET /api/obligations` · `POST /api/obligations/{id}/approve` · `PATCH /api/obligations/{id}` ·
`POST /api/documents/{id}/generate` · `GET /api/dashboard/summary` · `POST /api/audit/report`.

## Run the full stack (Docker Compose)

Brings up Postgres 16, Redis Streams, ChromaDB, the FastAPI API and the LangGraph worker.
Ollama runs on the **host** (reached via `host.docker.internal`).

```bash
python data/seed/build_pdfs.py          # corpus PDFs must exist before build
docker compose up --build
# API on http://localhost:8080 ; ingest a doc and the worker runs Phase A off the queue.
```

## Tests

```bash
PYTHONPATH=backend pytest backend/tests -q
```

Covers parsing, structure-aware chunking, hybrid retrieval, the deterministic
workflow/evidence agents, persistence + audit logging, and the API (no LLM required).

---

## Project layout

```
backend/
  config.py schemas.py llm.py services.py cli.py
  db/        models.py session.py crud.py        # system of record + append-only audit
  rag/       chunking.py embeddings.py vector_store.py hybrid_search.py corpus_index.py
  agents/    parser, regulation_extraction, obligation_extraction, rule_generation,
             workflow_mapping, evidence_mapping, audit_report
  graph/     state.py pipeline.py                 # LangGraph orchestration
  ingestion/ service.py worker.py                 # Redis Streams
  api/       main.py routes_*.py serializers.py
  tests/
data/
  seed/      circulars.py build_pdfs.py           # synthetic SEBI corpus generator
  corpus/    *.pdf (generated)                    # the RAG corpus
  org_config.json                                 # functional-area registry for workflow mapping
```

## Notes & scope

- The corpus circulars under `data/seed/` are **synthetic**, written in SEBI style for
  demonstration only — they are not real SEBI instruments.
- Deferred to later milestones (per proposal §14.3 exclusions): React UI, scheduled
  compliance monitoring/alerting, evidence upload + gap analysis, Keycloak RBAC/MFA,
  multi-tenant deployment, external task-tool integrations.
- The LLM provider is pluggable (`config.py: llm_provider`); Ollama is the on-prem default.
