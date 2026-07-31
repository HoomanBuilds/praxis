# 07 · Knowledge Graph

The knowledge graph is the persistent compliance layer (proposal §5.2.3 data layer). It is a
**projection** over the relational store (`backend/kg/graph.py`), so it is always consistent
with the system of record and inherently incremental: because the diff engine only
(re)processes changed sections, a new circular updates **only the affected nodes** — the rest
of the graph is untouched.

## Node types

| Node type | Source | Key | Label |
|---|---|---|---|
| `regulation` | `documents` | `reg:<doc_id>` | circular reference / title |
| `obligation` | `obligations` | `ob:<ob_id>` | obligation identifier |
| `department` | `obligations.functional_area` | `dept:<area>` | functional area |
| `rule` | `rules` | `rule:<rule_id>` | rule type |
| `task` | `tasks` | `task:<task_id>` | task title (+ deadline, status) |
| `owner` | `tasks.primary_owner` | `owner:<name>` | owner |
| `evidence` | `evidence_requirements` | `ev:<req_id>` | document type |

`department` and `owner` nodes are de-duplicated, so the graph naturally shows which teams and
owners carry the most obligations.

## Edge types

```
regulation ──CREATES──────────► obligation
obligation ──ASSIGNED_TO───────► department
obligation ──GOVERNED_BY───────► rule
obligation ──IMPLEMENTED_BY────► task
task       ──OWNED_BY──────────► owner
obligation ──REQUIRES──────────► evidence
obligation ──MODIFIES──────────► obligation   (cross-document supersession)
```

The `MODIFIES` edge is the **regulatory cross-reference intelligence** (proposal §12.2): when a
new circular's obligation closely matches a prior one in the obligation index, it is linked and
the new obligation is marked `modifies`. This lets the graph show the evolving state of an
obligation across circulars — a capability no off-the-shelf GRC tool provides for SEBI.

## Risk scoring

Risk Register and the knowledge graph share one deterministic scorer: `kg/graph.py: _risk_score`.
Because both views derive from the same function, the risk chip shown on an obligation in the
Knowledge Graph view and the ranking in the Risk Register page can never disagree. See
[09 Workflows & HITL](09_WORKFLOWS_AND_HITL.md) for the risk register.

## Example (live shape)

```
reg: SEBI/HO/MIRSD/.../2024/19  ──CREATES──►  ob: 129C0318-OB-001
                                                  │  "Formulate & annually review a board-
                                                  │   approved cyber security policy"
                       ┌──ASSIGNED_TO──────────────┼──────────────┐
                       ▼                            ▼              ▼
                 dept: Compliance        GOVERNED_BY rule:     IMPLEMENTED_BY task:
                                           documentation         "Implement: …" (due 2024-05-25)
                                                                        │ OWNED_BY
                                                                        ▼
                                                            owner: Chief Compliance Officer
                       ob ──REQUIRES──► ev: Board-approved policy document
```

## Graph size at submission

The current corpus produces a graph with **604 total nodes**: 279 obligation + 279 risk nodes
(one per obligation) plus the supporting regulation/department/rule/task/owner/evidence nodes.
All 7 organisational areas carry at least one obligation with a `primary_owner`.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/knowledge-graph` | `{nodes, edges, stats}` for the whole firm |
| `GET /api/knowledge-graph?document_id=<id>` | the graph scoped to one document |
| `GET /api/knowledge-graph/export.graphml` | GraphML (for Gephi/Cytoscape/yEd) |

`stats` includes `node_count`, `edge_count`, `nodes_by_type` and `cross_document_modifies`.

The `nodes`/`edges` JSON is shaped for direct rendering by a force-directed graph library (D3,
Cytoscape.js, react-force-graph). The GraphML export (built with no third-party dependency in
`kg/graph.py:to_graphml`) opens in standard graph tools.

## Why a projection rather than a separate graph database

For this prototype the graph is derived on demand from the relational store rather than
maintained in a dedicated graph DB (e.g. Neo4j). This keeps the system on a single, auditable
source of truth, avoids dual-write consistency problems, and is sufficient at the corpus size
in scope. The projection boundary is clean: swapping in a graph database later means
re-pointing `kg/graph.py` without changing any callers.

## Related

- [03 Agent Architecture](03_AGENT_ARCHITECTURE.md) — cross-document reasoning that creates `MODIFIES`
- [05 Document Processing](05_DOCUMENT_PROCESSING.md) — incremental updates that touch few nodes
- [13 Auditability](13_AUDITABILITY.md) — graph stays consistent with the audit trail
