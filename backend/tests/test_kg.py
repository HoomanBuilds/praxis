import uuid
from datetime import date, timedelta
from xml.dom import minidom

import schemas
from db import crud
from db.session import session_scope
from kg.graph import build_graph, to_graphml


def _seed() -> tuple[str, str, str]:
    """Seed one document with a prior + current obligation (linked), a rule, a task and an
    evidence requirement. Returns (document_id, obligation_id, prior_obligation_id). IDs are
    unique per call so the helper can be used by several tests against the shared test DB."""
    sfx = uuid.uuid4().hex[:8]
    with session_scope() as s:
        doc = crud.create_document(
            s, reference="SEBI/KG/CIR/2026/1", title="KG Test Circular",
            file_path="", content_hash=f"kg-{sfx}",
        )
        prior = crud.create_obligation(s, schemas.Obligation(
            identifier=f"P-OB-{sfx}", document_id=doc.id, description="prior duty", source_text="x"))
        ob = crud.create_obligation(s, schemas.Obligation(
            identifier=f"KG-OB-{sfx}", document_id=doc.id, description="Maintain cyber policy",
            source_text="shall maintain a policy", functional_area=schemas.FunctionalArea.TECHNOLOGY,
            linked_prior_obligation_id=prior.id))
        crud.create_rule(s, ob.id, schemas.ComplianceRule(
            rule_id=f"KG-R-{sfx}", obligation_id=ob.id, rule_type=schemas.RuleType.DOCUMENTATION,
            evaluation_criterion="a board-approved policy exists", evidence_type="policy document"))
        crud.create_task(s, schemas.WorkflowTask(
            task_id=f"KG-T-{sfx}", obligation_id=ob.id, rule_id=f"KG-R-{sfx}", title="Implement cyber policy",
            functional_area=schemas.FunctionalArea.TECHNOLOGY, primary_owner="CISO",
            deadline=date(2026, 6, 1)))
        crud.create_evidence_requirement(s, schemas.EvidenceRequirement(
            requirement_id=f"KG-E-{sfx}", obligation_id=ob.id, document_type="Policy document",
            required_content="the cyber security policy"))
        return doc.id, ob.id, prior.id


def test_build_graph_projects_all_entity_types_and_edges():
    doc_id, _ob_id, prior_id = _seed()
    with session_scope() as s:
        g = build_graph(s, document_id=doc_id)

    node_types = {n["type"] for n in g["nodes"]}
    assert {"regulation", "obligation", "department", "rule", "task", "owner", "evidence"} <= node_types

    edge_types = {e["type"] for e in g["edges"]}
    assert {"CREATES", "ASSIGNED_TO", "GOVERNED_BY", "IMPLEMENTED_BY", "OWNED_BY",
            "REQUIRES", "MODIFIES"} <= edge_types


def test_cross_document_modifies_edge_targets_prior_obligation():
    doc_id, _ob_id, prior_id = _seed()
    with session_scope() as s:
        g = build_graph(s, document_id=doc_id)
    assert any(e["type"] == "MODIFIES" and e["target"] == f"ob:{prior_id}" for e in g["edges"])
    assert g["stats"]["cross_document_modifies"] >= 1


def test_document_graph_keeps_linked_obligation_from_another_document():
    suffix = uuid.uuid4().hex[:8]
    with session_scope() as s:
        prior_doc = crud.create_document(
            s, reference=f"SEBI/KG/PRIOR/{suffix}", title="Prior Circular",
            file_path="", content_hash=f"kg-prior-{suffix}",
        )
        prior = crud.create_obligation(s, schemas.Obligation(
            identifier=f"PRIOR-{suffix}", document_id=prior_doc.id,
            description="Prior requirement", source_text="prior source",
        ))
        current_doc = crud.create_document(
            s, reference=f"SEBI/KG/CURRENT/{suffix}", title="Current Circular",
            file_path="", content_hash=f"kg-current-{suffix}",
        )
        current = crud.create_obligation(s, schemas.Obligation(
            identifier=f"CURRENT-{suffix}", document_id=current_doc.id,
            description="Current requirement", source_text="current source",
            linked_prior_obligation_id=prior.id,
        ))
        prior_id = prior.id
        current_id = current.id
        graph = build_graph(s, document_id=current_doc.id)

    node_ids = {node["id"] for node in graph["nodes"]}
    assert f"ob:{prior_id}" in node_ids
    assert any(
        edge["source"] == f"ob:{current_id}"
        and edge["target"] == f"ob:{prior_id}"
        and edge["type"] == "MODIFIES"
        for edge in graph["edges"]
    )


def test_graphml_export_is_wellformed_xml():
    doc_id, _ob_id, _prior_id = _seed()
    with session_scope() as s:
        xml = to_graphml(build_graph(s, document_id=doc_id))
    minidom.parseString(xml)  # raises on malformed XML
    assert "<graphml" in xml and "</graphml>" in xml


def test_graph_risk_uses_overdue_task_signal():
    doc_id, ob_id, _prior_id = _seed()
    with session_scope() as s:
        ob = crud.get_obligation(s, ob_id)
        ob.status = "approved"
        task = crud.list_tasks(s, obligation_id=ob_id)[0]
        task.deadline = date.today() - timedelta(days=1)
        graph = build_graph(s, document_id=doc_id)

    risk = next(node for node in graph["nodes"] if node["id"] == f"risk:{ob_id}")
    assert risk["level"] == "high"
    assert risk["label"] == "Implementation task overdue"


def test_graph_contains_no_edges_to_missing_nodes():
    doc_id, _ob_id, _prior_id = _seed()
    with session_scope() as s:
        graph = build_graph(s, document_id=doc_id)

    node_ids = {node["id"] for node in graph["nodes"]}
    assert all(edge["source"] in node_ids and edge["target"] in node_ids for edge in graph["edges"])
