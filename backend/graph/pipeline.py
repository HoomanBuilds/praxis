"""LangGraph orchestration of the agent pipeline (proposal §5.2.2, §6.1, §11.2).

Two compiled graphs implement the human-in-the-loop split:

* **Extraction graph (Phase A)** — parser → regulation-extraction → obligation-extraction,
  with a conditional edge that routes documents with poor parse quality to a human-parse
  flag instead of proceeding (§6.1). Output: obligations pending review.

* **Generation graph (Phase B)** — runs only on human-approved obligations:
  rule-generation, then workflow-mapping and evidence-mapping in parallel branches that
  fan back in (LangGraph native parallel node execution, §11.2).

Nodes are side-effect free with respect to the database; persistence is handled by the
caller (worker / API / CLI), keeping the graph reusable and testable.
"""
from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from agents import (
    evidence_mapping,
    obligation_extraction,
    parser,
    regulation_extraction,
    rule_generation,
    workflow_mapping,
)
from config import settings
from graph.state import GraphState
from preprocessing import classifier

# ---------------------------------------------------------------------------
# Phase A nodes
# ---------------------------------------------------------------------------


def node_parse(state: GraphState) -> dict:
    parsed = parser.parse_document(state.file_path)
    needs_human = parsed.parse_quality < settings.parse_quality_min
    log = {
        "stage": "document_parser",
        "parse_quality": parsed.parse_quality,
        "sections": len(parsed.sections),
        "used_ocr": parsed.used_ocr,
    }
    return {"parsed": parsed, "needs_human_parse": needs_human, "logs": [log]}


def node_regulation(state: GraphState) -> dict:
    context = regulation_extraction.extract_regulatory_context(state.parsed, state.reference)
    log = {
        "stage": "regulation_extraction",
        "obligation_mode": context.obligation_mode.value,
        "intermediary_classes": [c.value for c in context.intermediary_classes],
        "effective_date": context.effective_date,
    }
    return {"context": context, "effective_date": context.effective_date, "logs": [log]}


def node_obligation(state: GraphState) -> dict:
    # Candidate filter (drop TOC/definitions/annexures) then hybrid extraction.
    candidates, _ = classifier.filter_candidates(state.parsed.sections)
    obligations, stats = obligation_extraction.extract_obligations(
        state.document_id, candidates, state.context
    )
    log = {"stage": "obligation_extraction", **stats}
    return {"obligations": obligations, "logs": [log]}


def node_flag_parse(state: GraphState) -> dict:
    flag = (
        f"Parse quality {state.parsed.parse_quality if state.parsed else 0} below "
        f"{settings.parse_quality_min}; document routed for human parsing."
    )
    return {"flags": [flag], "logs": [{"stage": "human_parse_gate", "flag": flag}]}


def _route_after_parse(state: GraphState) -> str:
    return "flag" if state.needs_human_parse else "continue"


def build_extraction_graph():
    g = StateGraph(GraphState)
    g.add_node("parse", node_parse)
    g.add_node("regulation", node_regulation)
    g.add_node("obligation", node_obligation)
    g.add_node("flag_parse", node_flag_parse)

    g.add_edge(START, "parse")
    g.add_conditional_edges("parse", _route_after_parse, {"continue": "regulation", "flag": "flag_parse"})
    g.add_edge("regulation", "obligation")
    g.add_edge("obligation", END)
    g.add_edge("flag_parse", END)
    return g.compile()


# ---------------------------------------------------------------------------
# Phase B nodes
# ---------------------------------------------------------------------------


def node_rules(state: GraphState) -> dict:
    rules = rule_generation.generate_rules(state.obligations)
    return {"rules": rules, "logs": [{"stage": "rule_generation", "rules": len(rules)}]}


def node_workflow(state: GraphState) -> dict:
    tasks = workflow_mapping.map_workflows(state.obligations, state.rules, state.effective_date)
    return {"tasks": tasks, "logs": [{"stage": "workflow_mapping", "tasks": len(tasks)}]}


def node_evidence(state: GraphState) -> dict:
    reqs = evidence_mapping.map_evidence(state.obligations, state.rules)
    return {"evidence": reqs, "logs": [{"stage": "evidence_mapping", "evidence": len(reqs)}]}


def build_generation_graph():
    g = StateGraph(GraphState)
    g.add_node("rules", node_rules)
    g.add_node("workflow", node_workflow)
    g.add_node("evidence", node_evidence)

    g.add_edge(START, "rules")
    # Workflow mapping and evidence mapping are independent once rules exist (§11.2).
    g.add_edge("rules", "workflow")
    g.add_edge("rules", "evidence")
    g.add_edge("workflow", END)
    g.add_edge("evidence", END)
    return g.compile()


# ---------------------------------------------------------------------------
# Convenience runners (return a GraphState)
# ---------------------------------------------------------------------------

_extraction_graph = None
_generation_graph = None


def _to_state(result) -> GraphState:
    return result if isinstance(result, GraphState) else GraphState(**result)


def run_extraction(file_path: str, document_id: str, reference: str = "") -> GraphState:
    global _extraction_graph
    if _extraction_graph is None:
        _extraction_graph = build_extraction_graph()
    initial = GraphState(document_id=document_id, file_path=file_path, reference=reference)
    return _to_state(_extraction_graph.invoke(initial))


def run_generation(obligations, effective_date: str | None = None) -> GraphState:
    global _generation_graph
    if _generation_graph is None:
        _generation_graph = build_generation_graph()
    initial = GraphState(obligations=list(obligations), effective_date=effective_date)
    return _to_state(_generation_graph.invoke(initial))
