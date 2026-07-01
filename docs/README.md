# PRAXIS / RegPilot — Documentation

**An agentic compliance platform for India's securities market**
SEBI Securities Market TechSprint 2026 · Problem Statement 2 (Agentic Compliance)

PRAXIS ingests SEBI circulars and turns regulatory text into **discrete,
provenance-linked compliance obligations → machine-evaluable rules → assigned workflow
tasks → audit-ready evidence**, with human-in-the-loop review gates and a compliance
knowledge graph. The language model runs **locally via Ollama**, so no regulatory content
leaves the client boundary.

The defining engineering property of the system is that it is **scale-aware**: it does not
run a language model over every page of a 400-page master circular. A deterministic
pre-processing funnel (classify → diff → rule-based extraction) reserves the LLM for the
~10–20% of content that genuinely needs reasoning, cutting model calls by **~85–90%**.

---

## Documentation map

| Document | What it covers |
|---|---|
| [architecture.md](architecture.md) | System subsystems, the layered pipeline, end-to-end data flow, design principles |
| [processing-funnel.md](processing-funnel.md) | The scale-aware funnel: document types, candidate filter, diff engine, hybrid extraction — with measured reductions |
| [agents.md](agents.md) | Reference for each agent (parser, regulation, obligation, rule, workflow, evidence, audit) |
| [knowledge-graph.md](knowledge-graph.md) | The compliance knowledge graph model, edges and endpoints |
| [data-model.md](data-model.md) | Relational schema (documents, obligations, rules, tasks, evidence, fingerprints, audit log) |
| [api-reference.md](api-reference.md) | REST endpoints with request/response shapes |
| [setup-and-run.md](setup-and-run.md) | Install, CLI, API, Docker Compose, tests |

For a quick orientation, read **architecture.md** then **processing-funnel.md**.

---

## At a glance

- **Orchestration:** LangGraph (typed state, conditional + parallel edges)
- **LLM:** Ollama `llama3.1:8b` (local, on-prem) with schema-validated structured output
- **Retrieval:** sentence-transformers `all-mpnet-base-v2` + ChromaDB + BM25, fused with Reciprocal Rank Fusion
- **Pre-processing funnel:** document-type detection · candidate filter · SHA-256 section fingerprinting + diff · deterministic rule engine + LLM fallback
- **Store:** SQLAlchemy (SQLite locally / PostgreSQL 16 in Docker), append-only audit log
- **Queue:** Redis Streams (ingestion → worker)
- **API:** FastAPI · **Knowledge graph:** relational projection with GraphML export

## Measured scalability (real SEBI master circulars)

| Document | Sections | Candidates after filter | LLM calls (old → new) | Reduction |
|---|---|---|---|---|
| Master Circular for Investment Advisers (94 p) | 151 | 57 | ~130 → 18 | ~86% |
| Master Circular for Stock Brokers (414 p) | 870 | 296 | ~629 → 72 | ~89% |

On a **re-issue** of the same master circular, the diff engine skips unchanged sections,
driving new LLM calls toward zero. See [processing-funnel.md](processing-funnel.md).

## Scope

This repository is **Milestone 1 — the backend pipeline**, driven via REST + CLI. Deferred
to later milestones (per proposal §14.3/§14.4): React UI, scheduled compliance monitoring,
evidence upload + gap analysis, Keycloak RBAC/MFA, multi-tenant, external task-tool
integrations. The corpus circulars under `data/seed/` are **synthetic** (SEBI-style, for
demonstration); the two master circulars used for scalability testing are real SEBI PDFs.
