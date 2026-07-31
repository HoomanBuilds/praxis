<p align="center">
  <img src="frontend/public/ChatGPT Image Jul 1, 2026, 06_10_08 PM (1).png" alt="PRAXIS" width="250" />
</p>


<p align="center"><b>The agentic compliance platform for India's securities market.</b></p>

<p align="center">
  <a href="#"><img alt="status" src="https://img.shields.io/badge/status-Submission%20%E2%80%94%20full%20stack-brightgreen?style=flat-square"></a>
  <a href="#"><img alt="python" src="https://img.shields.io/badge/python-3.11-blue?style=flat-square&logo=python&logoColor=white"></a>
  <a href="#"><img alt="langgraph" src="https://img.shields.io/badge/orchestration-LangGraph-1C3C3C?style=flat-square"></a>
  <a href="#"><img alt="llm" src="https://img.shields.io/badge/LLM-Ollama%20(local)-000000?style=flat-square&logo=ollama&logoColor=white"></a>
  <a href="#"><img alt="submission" src="https://img.shields.io/badge/SEBI%20TechSprint%202026-PS2%20Agentic%20Compliance-002868?style=flat-square"></a>
</p>

---

PRAXIS ingests SEBI circulars and runs them through a LangGraph-orchestrated multi-agent
pipeline that turns regulatory text into **discrete, provenance-linked compliance
obligations → machine-evaluable rules → assigned workflow tasks → audit-ready evidence
packages** — reviewed at every consequential step by a human, surfaced through a full
compliance workspace, and explainable on demand by a grounded AI copilot. The language
model runs **locally via Ollama**, so no regulatory content leaves the client boundary.

> [!TIP]
> New to the repo? Start with the submission docs set —
> read [`docs/00_OVERVIEW.md`](docs/00_OVERVIEW.md), then
> [`docs/02_SYSTEM_ARCHITECTURE.md`](docs/02_SYSTEM_ARCHITECTURE.md) and
> [`docs/04_AI_PIPELINE.md`](docs/04_AI_PIPELINE.md) — the engineering property that makes
> PRAXIS work on real, 400-page master circulars instead of toy PDFs.

It is **scale-aware**: a deterministic pre-processing funnel (classify → diff → rule-based
extraction) reserves the LLM for the ~10–20% of content that needs reasoning, cutting model
calls on real SEBI master circulars by **~85–90%** (151-section doc: ~130 → 18 calls;
870-section doc: ~629 → 72 calls). The savings are recorded per run in `documents.funnel` —
observable, not claimed.

**End-to-end demo corpus**: the real **94-page SEBI Master Circular for Investment Advisers**
(`SEBI/HO/MIRSD/MIRSD-PoD/P/CIR/2025/94`, 151 sections) is ingested in the shipped database.
Measured funnel on it: 69 recitals + 57 regulatory candidates classified → **40 sections
deterministic / 17 routed to the LLM → 18 LLM calls total → 275 obligations** (88 deterministic,
187 LLM, each with verbatim source provenance), reviewed through the human-in-the-loop gate
before Phase B generates rules, workflow tasks, and evidence templates only for the approved set.

📚 **Full documentation lives in [`docs/`](docs/README.md)** — an 18-document submission set
(overview → problem alignment → architecture → agent pipeline → schema → knowledge graph →
integrations → security → auditability → deployment → demo guide → judge Q&A), plus Mermaid
diagrams in [`diagrams/`](diagrams/).

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
| | LangGraph orchestration — 2-phase, HITL gate, conditional + parallel edges | `backend/graph/pipeline.py` + `backend/services/` |
| | Compliance knowledge graph (relational projection + GraphML export) | `backend/kg/graph.py` |
| | RAG — structure-aware chunking, mpnet embeddings, ChromaDB, hybrid search + RRF | `backend/rag/` |
| | Redis Streams ingestion + worker | `backend/ingestion/` |
| | Append-only audit log | `backend/db/crud.py` |
| **API** | FastAPI surface — documents, obligations, rules, tasks, evidence, dashboard, audit, knowledge graph, filings, calendar, notifications, SSO, users, activity, search | `backend/api/` |
| | AI Copilot — grounded Q&A over live obligations/rules/tasks, no parametric guessing | `backend/api/routes_copilot.py` |
| | Integrations — email (SMTP), calendar (ICS), SSO (Keycloak OIDC), Slack, Jira, Drive, DocuSign | `backend/integrations/` |
| **Workspace UI** | 24 pages — Command Center, Regulations, Obligations, Review, Tasks, Evidence Center, Calendar, Filing Tracker, Knowledge Graph, Risk Register, AI Copilot, Analytics, Watch, Reports, Audit Trail, Settings, Users, Departments, and more | `frontend/src/pages/` |

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

## Integrations

| Connector | Demo status | Notes |
|---|---|---|
| **Email** | ✓ connected | SMTP notifications from `noreply@praxis.local` via demo sink (`:2525`) |
| **Calendar** | ✓ connected | live ICS feed of task deadlines |
| **SSO** | ✓ connected | Keycloak demo realm `praxis` (Docker, `:8081`) — OIDC login |
| **Slack / Jira** | not connected | implemented; need the firm's workspace/Atlassian account |
| **Google Drive / DocuSign** | not connected | implemented; need OAuth client / sandbox account |
| **SEBI SCORES** | manual field | honest filing-status tracking, audit-exported (no fake live API) |

Settings shows backend-truth status (`✓ Verified` + `Last tested:`). See
[`docs/11_INTEGRATIONS.md`](docs/11_INTEGRATIONS.md).

## Tech stack

**Orchestration & LLM** — LangGraph · LangChain · Ollama (`llama3.1:8b`, local/on-prem)
**Retrieval** — sentence-transformers (`all-mpnet-base-v2`) · ChromaDB · BM25 + Reciprocal Rank Fusion
**Backend** — FastAPI · SQLAlchemy (SQLite locally / PostgreSQL 16 in Docker) · Redis Streams · pdfplumber · Tesseract · reportlab / openpyxl
**Frontend** — React 18 · TypeScript · Vite · Tailwind CSS · TanStack Query · React Router
**Identity & integrations** — Keycloak 26 (OIDC) · SMTP · ICS · OAuth connectors

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
cp .env.example .env            # then set PRAXIS_* values as needed

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

Brings up Postgres 16, Redis Streams, ChromaDB, the FastAPI API, the LangGraph worker, and a
**Keycloak SSO demo realm** (`praxis` — users `admin@praxis.local`/`admin123`,
`officer@praxis.local`/`officer123`). Ollama runs on the **host** (reached via
`host.docker.internal`); the frontend is run separately with `npm run dev` against it.

```bash
python data/seed/build_pdfs.py          # corpus PDFs must exist before build
docker compose up --build
# API on http://localhost:8080 · Keycloak on http://localhost:8081
```

## Tests

```bash
PYTHONPATH=backend pytest backend/tests -q    # 59 passing
```

Covers parsing, structure-aware chunking, hybrid retrieval, document-type/fingerprint
detection, the deterministic workflow/evidence agents, persistence + audit logging, and the
API — no LLM required.

---

## API surface

`POST /api/documents/ingest` · `POST /api/documents/{id}/process` · `GET /api/documents/{id}` ·
`GET /api/obligations` · `GET /api/obligations/{id}` · `GET /api/obligations/{id}/explain` ·
`POST /api/obligations/{id}/approve` · `POST /api/obligations/{id}/reject` ·
`PATCH /api/obligations/{id}` · `POST /api/documents/{id}/generate` · `GET /api/rules` ·
`GET /api/tasks` · `GET /api/evidence` · `GET /api/dashboard/summary` ·
`POST /api/audit/report` · `GET /api/audit/download/{filename}` ·
`GET /api/knowledge-graph` · `GET /api/knowledge-graph/export.graphml` ·
`GET /api/activity` · `GET /api/search` · `POST /api/copilot` ·
`GET/POST /api/integrations/*` · `GET /api/org-config/functional-areas` ·
`POST /api/auth/*` / SSO endpoints

Full request/response shapes in [`docs/api-reference.md`](docs/api-reference.md).

## Project layout

```
backend/
  config.py schemas.py llm.py services.py cli.py
  db/        models.py session.py crud.py             # system of record + append-only audit
  rag/       chunking.py embeddings.py vector_store.py hybrid_search.py corpus_index.py
  agents/    parser, regulation_extraction, obligation_extraction, rule_generation,
             workflow_mapping, evidence_mapping, audit_report
  preprocessing/  document_type.py classifier.py fingerprint.py rule_extractor.py
  graph/     state.py pipeline.py                     # LangGraph orchestration
  ingestion/ service.py worker.py                     # Redis Streams
  integrations/ providers.py ics.py sso.py + Slack/Jira/Drive/DocuSign adapters
  kg/        graph.py                                 # knowledge-graph projection + GraphML
  api/       main.py + routes_*.py (documents, obligations, tasks, compliance, dashboard,
             audit, activity, copilot, calendar, filings, notifications, sso, integrations,
             org_config, users, auth, api_keys, data, watch)
  tests/
frontend/
  src/pages/     24 pages — Command Center, Regulations, Obligations, Review, Tasks,
                 Evidence Center, Calendar, Filing Tracker, Knowledge Graph, Risk Register,
                 AI Copilot, Analytics, Watch, Reports, Audit Trail, Settings, Users,
                 Departments, Firm Profile, Notifications, Filings, Api Keys, Login, …
  src/components/ Layout, Logo, CommandPalette, CopilotSidebar, ThemeToggle + ui primitives
  src/hooks/     useAreas, useAuth, useCopilot, …
data/
  seed/      circulars.py build_pdfs.py                # synthetic SEBI corpus generator
  corpus/    *.pdf (generated)                         # the RAG corpus
  org_config.json                                      # functional-area registry for workflow mapping
  keycloak/  praxis-realm.json                         # SSO demo realm (auto-imported)
```

## Notes & scope

- The corpus circulars under `data/seed/` are **synthetic**, written in SEBI style for
  demonstration only — they are not real SEBI instruments. The real master circulars used for
  the scalability measurements and the shipped demo (including the 94-page IA Master Circular,
  `SEBI/HO/MIRSD/MIRSD-PoD/P/CIR/2025/94`) are actual SEBI PDFs.
- The LLM provider is pluggable (`backend/config.py: llm_provider`); Ollama is the on-prem
  default. The local model keeps regulatory content inside the client boundary.
- Honest prototype boundaries: SEBI SCORES is a manual field; Slack/Jira/Drive/DocuSign need
  the firm's accounts; no RBAC or schema-migration tool yet; rule evaluation is generated, not
  executed against live evidence. Full accounting in
  [`docs/17_LIMITATIONS_AND_ROADMAP.md`](docs/17_LIMITATIONS_AND_ROADMAP.md).

---

<p align="center">Built for the SEBI Securities Market TechSprint 2026 — Problem Statement 2 (Agentic Compliance).</p>
