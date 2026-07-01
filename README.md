<p align="center">
  <img src="frontend/public/logo.png" alt="PRAXIS" width="96" />
</p>

<h1 align="center">PRAXIS</h1>
<p align="center"><b>The agentic compliance platform for India's securities market.</b></p>

<p align="center">
  <a href="#"><img alt="status" src="https://img.shields.io/badge/status-Milestone%202%20%E2%80%94%20full%20stack-brightgreen?style=flat-square"></a>
  <a href="#"><img alt="python" src="https://img.shields.io/badge/python-3.11-blue?style=flat-square&logo=python&logoColor=white"></a>
  <a href="#"><img alt="langgraph" src="https://img.shields.io/badge/orchestration-LangGraph-1C3C3C?style=flat-square"></a>
  <a href="#"><img alt="llm" src="https://img.shields.io/badge/LLM-Ollama%20(local)-000000?style=flat-square&logo=ollama&logoColor=white"></a>
  <a href="#"><img alt="submission" src="https://img.shields.io/badge/SEBI%20TechSprint%202026-PS2%20Agentic%20Compliance-002868?style=flat-square"></a>
</p>

---

PRAXIS ingests SEBI circulars and runs them through a LangGraph-orchestrated multi-agent
pipeline that turns regulatory text into **discrete, provenance-linked compliance
obligations → machine-evaluable rules → assigned workflow tasks → audit-ready evidence
packages** — reviewed at every consequential step by a human, surfaced through a
compliance workspace, and explainable on demand by a grounded AI copilot. The language
model runs **locally via Ollama**, so no regulatory content leaves the client boundary.

> [!TIP]
> New to the repo? Read [`docs/architecture.md`](docs/architecture.md) first, then
> [`docs/processing-funnel.md`](docs/processing-funnel.md) — that's the engineering property
> that makes PRAXIS work on real, 400-page master circulars instead of toy PDFs.

It is **scale-aware**: a deterministic pre-processing funnel (classify → diff → rule-based
extraction) reserves the LLM for the ~10–20% of content that needs reasoning, cutting model
calls on real SEBI master circulars by **~85–90%** (151-section doc: ~130 → 18 calls;
870-section doc: ~629 → 72 calls).

📚 **Full documentation lives in [`docs/`](docs/README.md)** — architecture, the processing
funnel, agents, knowledge graph, data model, API reference, and setup.

---

## What's in the box

| Layer | Capability | Where |
|---|---|---|
| **Agents** | Document Parser (pdfplumber + OCR fallback, structure, cross-refs) | `backend/agents/parser.py` |
| | Regulation Extraction (RAG context, intermediary class, mode, effective date) | `backend/agents/regulation_extraction.py` |
| | Obligation Extraction (structured LLM output, verbatim provenance, confidence) | `backend/agents/obligation_extraction.py` |
| | Rule Generation (5 rule types, qualitative handling) | `backend/agents/rule_generation.py` |
| | Workflow Mapping (owners, deadlines, dependency chains) | `backend/agents/workflow_mapping.py` |
| | Evidence Mapping (evidence templates per rule type) | `backend/agents/evidence_mapping.py` |
| | Audit Report (PDF + XLSX evidence package) | `backend/agents/audit_report.py` |
| **Pipeline** | Scale-aware pre-processing funnel (type detection, candidate filter, fingerprint+diff, hybrid extraction) | `backend/preprocessing/` |
| | LangGraph orchestration — 2-phase, HITL gate, conditional + parallel edges | `backend/graph/pipeline.py` |
| | Compliance knowledge graph (relational projection + GraphML export) | `backend/kg/graph.py` |
| | RAG — structure-aware chunking, mpnet embeddings, ChromaDB, hybrid search + RRF | `backend/rag/` |
| | Redis Streams ingestion + worker | `backend/ingestion/` |
| | Append-only audit log | `backend/db/crud.py` |
| **API** | FastAPI surface — documents, obligations, rules, tasks, evidence, dashboard, audit, knowledge graph, activity, search | `backend/api/` |
| | AI Copilot — grounded Q&A over live obligations/rules/tasks, no parametric guessing | `backend/api/routes_copilot.py` |
| **Workspace UI** | Dashboard, Documents, Review queue, Obligation workspace, Tasks, Knowledge graph, Copilot chat, Analytics, Reports, Audit trail, Settings | `frontend/src/pages/` |

The pipeline is split into two phases to make the human-in-the-loop constraint structural,
not optional:

```
Phase A (extraction):  parse → classify → diff → regulation-extraction → obligation-extraction
                        └─► obligations land "pending_review"
         ── HUMAN GATE: approve / edit / reject — via the Review UI, REST, or CLI ──
Phase B (generation):  rule-generation → (workflow-mapping ∥ evidence-mapping)
                        └─► rules / tasks / evidence — only for approved obligations
Audit Report:          on demand → traceable PDF + XLSX evidence package
Knowledge Graph:       always-on live projection of the compliance store
```

## Tech stack

**Orchestration & LLM** — LangGraph · LangChain · Ollama (`llama3.1:8b`, local/on-prem)
**Retrieval** — sentence-transformers (`all-mpnet-base-v2`) · ChromaDB · BM25 + Reciprocal Rank Fusion
**Backend** — FastAPI · SQLAlchemy (SQLite locally / PostgreSQL 16 in Docker) · Redis Streams · pdfplumber · Tesseract · reportlab / openpyxl
**Frontend** — React 18 · TypeScript · Vite · Tailwind CSS · TanStack Query · React Router · d3-force (knowledge graph)

---

## Quickstart

Prerequisites: **Python 3.11**, **Node 18+**, and Ollama running with the model pulled:

```bash
ollama pull llama3.1:8b        # the local compliance model
```

**1 — Backend: build the corpus, index it, run the pipeline**

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python data/seed/build_pdfs.py                             # synthetic SEBI corpus PDFs
PYTHONPATH=backend python -m cli index-corpus

# Run the whole pipeline on one circular (ingest → extract → review → generate → audit)
PYTHONPATH=backend python -m cli run data/corpus/cyber_security.pdf --auto-approve
```

**2 — API**

```bash
PYTHONPATH=backend uvicorn api.main:app --reload --port 8080
# Swagger UI: http://localhost:8080/docs
```

**3 — Workspace UI**

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173  (proxies /api to the FastAPI backend on :8080)
```

Or step through the pipeline manually via the CLI:

```bash
export PYTHONPATH=backend
python -m cli health
python -m cli ingest data/corpus/margin_pledge.pdf       # -> <document_id>
python -m cli process <document_id>                      # Phase A
python -m cli obligations <document_id>                  # inspect provenance
python -m cli approve <obligation_id>                     # HITL gate
python -m cli generate <document_id> --auto-approve       # Phase B
python -m cli audit --document <document_id>              # PDF + XLSX -> data/exports/
```

## Run the full stack (Docker Compose)

Brings up Postgres 16, Redis Streams, ChromaDB, the FastAPI API, and the LangGraph worker.
Ollama runs on the **host** (reached via `host.docker.internal`); the frontend is run
separately with `npm run dev` against it.

```bash
python data/seed/build_pdfs.py          # corpus PDFs must exist before build
docker compose up --build
# API on http://localhost:8080
```

## Tests

```bash
PYTHONPATH=backend pytest backend/tests -q
```

Covers parsing, structure-aware chunking, hybrid retrieval, document-type/fingerprint
detection, the deterministic workflow/evidence agents, persistence + audit logging, and the
API — no LLM required.

---

## API surface

`POST /api/documents/ingest` · `POST /api/documents/{id}/process` · `GET /api/documents/{id}` ·
`GET /api/obligations` · `GET /api/obligations/{id}` · `GET /api/obligations/{id}/explain` ·
`POST /api/obligations/{id}/approve` · `POST /api/obligations/{id}/reject` ·
`PATCH /api/obligations/{id}` · `POST /api/obligations/{id}/comments` ·
`POST /api/documents/{id}/generate` · `GET /api/rules` · `GET /api/tasks` · `GET /api/evidence` ·
`GET /api/dashboard/summary` · `POST /api/audit/report` · `GET /api/audit/download/{filename}` ·
`GET /api/knowledge-graph` · `GET /api/knowledge-graph/export.graphml` · `GET /api/activity` ·
`GET /api/search` · `POST /api/copilot`

Full request/response shapes in [`docs/api-reference.md`](docs/api-reference.md).

## Project layout

```
backend/
  config.py schemas.py llm.py services.py cli.py
  db/        models.py session.py crud.py             # system of record + append-only audit
  rag/       chunking.py embeddings.py vector_store.py hybrid_search.py corpus_index.py
  agents/    parser, regulation_extraction, obligation_extraction, rule_generation,
             workflow_mapping, evidence_mapping, audit_report
  graph/     state.py pipeline.py                      # LangGraph orchestration
  ingestion/ service.py worker.py                      # Redis Streams
  api/       main.py routes_documents.py routes_obligations.py routes_compliance.py
             routes_activity.py routes_copilot.py serializers.py
  tests/
frontend/
  src/pages/     Dashboard, Documents, Review, Obligations, ObligationWorkspace, Tasks,
                 KnowledgeGraph, CopilotPage, Analytics, Reports, AuditTrail, Settings
  src/components/ shared UI + Logo
  src/context/   CopilotContext
data/
  seed/      circulars.py build_pdfs.py                # synthetic SEBI corpus generator
  corpus/    *.pdf (generated)                          # the RAG corpus
  org_config.json                                       # functional-area registry for workflow mapping
```

## Notes & scope

- The corpus circulars under `data/seed/` are **synthetic**, written in SEBI style for
  demonstration only — they are not real SEBI instruments. The two master circulars used for
  the scalability measurements above are real SEBI PDFs.
- Deferred beyond this milestone: scheduled compliance monitoring/alerting, evidence upload +
  gap analysis, Keycloak RBAC/MFA, multi-tenant deployment, external task-tool integrations.
- The LLM provider is pluggable (`backend/config.py: llm_provider`); Ollama is the on-prem default.

---

<p align="center">Built for the SEBI Securities Market TechSprint 2026 — Problem Statement 2 (Agentic Compliance).</p>
