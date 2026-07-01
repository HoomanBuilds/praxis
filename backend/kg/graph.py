"""Build and export the compliance knowledge graph from the relational store."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from db import crud, models


def _node(nodes: dict, node_id: str, node_type: str, label: str, **props) -> str:
    if node_id not in nodes:
        nodes[node_id] = {"id": node_id, "type": node_type, "label": label, **props}
    return node_id


def build_graph(session: Session, document_id: str | None = None) -> dict:
    """Return {nodes, edges, stats}. Scope to one document or the whole firm."""
    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    if document_id:
        docs = [d] if (d := crud.get_document(session, document_id)) else []
    else:
        docs = crud.list_documents(session)

    for doc in docs:
        reg_id = _node(nodes, f"reg:{doc.id}", "regulation", doc.reference or doc.title,
                       title=doc.title, document_type=doc.document_type)
        obligations = crud.list_obligations(session, document_id=doc.id)
        for ob in obligations:
            ob_id = _node(nodes, f"ob:{ob.id}", "obligation", ob.identifier,
                          description=ob.description, confidence=ob.confidence,
                          status=ob.status, extraction_method=ob.extraction_method,
                          source_paragraph_ref=ob.source_paragraph_ref)
            edges.append({"source": reg_id, "target": ob_id, "type": "CREATES"})

            dept_id = _node(nodes, f"dept:{ob.functional_area}", "department",
                            ob.functional_area.replace("_", " ").title())
            edges.append({"source": ob_id, "target": dept_id, "type": "ASSIGNED_TO"})

            if ob.linked_prior_obligation_id:
                prior_id = f"ob:{ob.linked_prior_obligation_id}"
                edges.append({"source": ob_id, "target": prior_id, "type": "MODIFIES"})

            for rule in ob.rules:
                rule_id = _node(nodes, f"rule:{rule.id}", "rule",
                                rule.rule_type, evaluation=rule.evaluation_criterion)
                edges.append({"source": ob_id, "target": rule_id, "type": "GOVERNED_BY"})

            for task in ob.tasks:
                task_id = _node(nodes, f"task:{task.id}", "task", task.title[:60],
                                deadline=str(task.deadline) if task.deadline else None, status=task.status)
                edges.append({"source": ob_id, "target": task_id, "type": "IMPLEMENTED_BY"})
                if task.primary_owner:
                    owner_id = _node(nodes, f"owner:{task.primary_owner}", "owner", task.primary_owner)
                    edges.append({"source": task_id, "target": owner_id, "type": "OWNED_BY"})

            for ev in ob.evidence_requirements:
                ev_id = _node(nodes, f"ev:{ev.id}", "evidence", ev.document_type)
                edges.append({"source": ob_id, "target": ev_id, "type": "REQUIRES"})

    type_counts: dict[str, int] = {}
    for n in nodes.values():
        type_counts[n["type"]] = type_counts.get(n["type"], 0) + 1

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
        "stats": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "nodes_by_type": type_counts,
            "cross_document_modifies": sum(1 for e in edges if e["type"] == "MODIFIES"),
        },
    }


def to_graphml(graph: dict) -> str:
    """Minimal GraphML export (no third-party dependency) for external graph tools."""
    def esc(s: str) -> str:
        return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
        '<key id="label" for="node" attr.name="label" attr.type="string"/>',
        '<key id="type" for="node" attr.name="type" attr.type="string"/>',
        '<key id="etype" for="edge" attr.name="type" attr.type="string"/>',
        '<graph edgedefault="directed">',
    ]
    for n in graph["nodes"]:
        lines.append(
            f'<node id="{esc(n["id"])}"><data key="label">{esc(n["label"])}</data>'
            f'<data key="type">{esc(n["type"])}</data></node>'
        )
    for i, e in enumerate(graph["edges"]):
        lines.append(
            f'<edge id="e{i}" source="{esc(e["source"])}" target="{esc(e["target"])}">'
            f'<data key="etype">{esc(e["type"])}</data></edge>'
        )
    lines += ["</graph>", "</graphml>"]
    return "\n".join(lines)
