from datetime import date

from agents.evidence_mapping import map_evidence
from agents.workflow_mapping import _compute_deadline, map_workflows
from schemas import (
    ComplianceRule,
    FunctionalArea,
    Obligation,
    RuleType,
)


def _obligation(area=FunctionalArea.TECHNOLOGY, text="board-approved cyber policy") -> Obligation:
    return Obligation(
        identifier="OB-T1",
        document_id="doc",
        description="Maintain a board-approved cyber security policy",
        source_text=text,
        source_paragraph_ref="2",
        functional_area=area,
    )


def _rule(rule_type=RuleType.DOCUMENTATION) -> ComplianceRule:
    return ComplianceRule(
        rule_id="r1",
        obligation_id="OB-T1",
        rule_type=rule_type,
        evaluation_criterion="Approved policy exists",
        evidence_type="policy document",
    )


def test_deadline_buffers_before_effective_date():
    d = _compute_deadline("2030-01-15", buffer_days=7)
    assert d == date(2030, 1, 8)


def test_past_effective_date_clamps_to_today():
    d = _compute_deadline("2000-01-01", buffer_days=7)
    assert d >= date.today()


def test_workflow_mapping_assigns_owner_and_reviewer():
    ob = _obligation()
    tasks = map_workflows([ob], {"OB-T1": _rule()}, effective_date="2030-01-15")
    primary = tasks[0]
    assert primary.primary_owner  # mapped from org_config
    assert primary.reviewer
    assert primary.deadline == date(2030, 1, 8)
    assert primary.functional_area == FunctionalArea.TECHNOLOGY


def test_documentation_dependency_chain_for_board_obligation():
    # A technology obligation that mentions the board and is NOT itself a documentation rule
    # should spawn a dependent legal/board-approval task.
    ob = _obligation(area=FunctionalArea.TECHNOLOGY, text="approved by its board of directors")
    tasks = map_workflows([ob], {"OB-T1": _rule(RuleType.PROCESS_ADHERENCE)}, effective_date="2030-01-15")
    assert len(tasks) == 2
    dependent = [t for t in tasks if t.depends_on_task_id]
    assert dependent and dependent[0].functional_area == FunctionalArea.LEGAL


def test_evidence_mapping_for_documentation_rule():
    ob = _obligation()
    reqs = map_evidence([ob], {"OB-T1": _rule(RuleType.DOCUMENTATION)})
    types = " ".join(r.document_type.lower() for r in reqs)
    assert "policy" in types


def test_evidence_mapping_adds_board_resolution_for_non_doc_board_obligation():
    # A board-mentioning obligation whose rule is NOT documentation gets a board-resolution
    # evidence requirement in addition to its primary evidence.
    ob = _obligation(text="approved by its board of directors")
    reqs = map_evidence([ob], {"OB-T1": _rule(RuleType.PROCESS_ADHERENCE)})
    assert any("board resolution" in r.document_type.lower() for r in reqs)
