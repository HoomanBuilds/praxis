from datetime import date

from agents.evidence_mapping import map_evidence
from agents.workflow_mapping import _compute_deadline, build_task_title, map_workflows
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


# --- Task titles -----------------------------------------------------------
# Titles used to be `f"Implement: {ob.description[:90]}"`, which stored a hard cut
# mid-word ("...must appoin") with no ellipsis and led with legal citation rather than
# the action. They are now verb-first, sourced from the rule's evaluation criterion,
# and never truncated at write time — the UI clamps for display.


def test_title_prefers_evaluation_criterion_over_legal_preamble():
    title = build_task_title(
        "In terms of Regulation 7 of SEBI (Investment Advisers) Regulations, 2013, PAIA shall obtain certification.",
        "obtain relevant certification from National Institute of Securities Market (NISM)",
    )
    assert title == "Obtain relevant certification from National Institute of Securities Market (NISM)"
    assert "In terms of" not in title


def test_title_is_not_truncated_at_write_time():
    """The 90-char cut was the bug — long titles must survive intact."""
    criterion = "maintain " + "a detailed record of every client interaction " * 5
    title = build_task_title("", criterion)
    assert len(title) > 90
    assert not title.endswith("…")
    assert title.startswith("Maintain")


def test_non_imperative_criterion_gets_a_leading_verb():
    title = build_task_title("", "existence of NISM Series-X-A and NISM Series-X-B certifications")
    assert title == "Ensure existence of NISM Series-X-A and NISM Series-X-B certifications"


def test_acronyms_survive_the_leading_verb():
    """Lower-casing the first letter to flow after "Ensure" must not break acronyms."""
    assert build_task_title("", "PAIA has obtained certification").startswith("Ensure PAIA")
    assert build_task_title("", "NISM Series-XXV-B certification is obtained").startswith("Ensure NISM")


def test_falls_back_to_obligation_when_no_rule():
    title = build_task_title("IAs shall ensure client level segregation.", None)
    assert title.startswith("Ensure IAs shall ensure client level segregation") or title.startswith("Ensure")
    assert title


def test_empty_inputs_do_not_produce_an_empty_title():
    assert build_task_title("", None) == "Implement obligation"


def test_extremely_long_title_is_ellipsised_at_the_column_limit():
    """512-char column: a pathological criterion must not overflow it."""
    title = build_task_title("", "maintain " + "x" * 900)
    assert len(title) <= 500
    assert title.endswith("…")
