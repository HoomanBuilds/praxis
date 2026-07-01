"""Rule Generation Agent (proposal §6.2.4).

Translates each approved obligation into a machine-evaluable compliance rule in the
RegPilot rule schema. A rule has a type (deadline / threshold / documentation /
periodic-filing / process-adherence), an evaluation criterion, a timeline, a verbatim
threshold where the text states one, and the evidence type required. Where an obligation
states no precise value (e.g. "adequate systems and controls"), the rule is marked
qualitative and routed to human judgement rather than being given a fabricated threshold.
"""
from __future__ import annotations

import uuid

from llm import StructuredOutputError, structured_complete
from schemas import ComplianceRule, ComplianceRuleLLM, Obligation, RuleType

SYSTEM_PROMPT = (
    "You convert a single SEBI compliance obligation into a structured, machine-evaluable "
    "rule. Return JSON only.\n\n"
    "Choose 'rule_type' from: deadline (a one-off action due by a date/within a period), "
    "threshold (a numeric or defined limit must be met), documentation (a policy/record/"
    "board approval must exist), periodic_filing (a recurring report/return must be filed), "
    "process_adherence (an ongoing process/control must be followed).\n"
    "- 'evaluation_criterion': what concretely demonstrates compliance.\n"
    "- 'timeline': the absolute date or rolling period, copied verbatim if stated, else null.\n"
    "- 'threshold_value': the verbatim numeric/defined threshold if the text states one, else null. "
    "Do NOT invent a threshold.\n"
    "- 'is_qualitative': true only when the obligation resists a precise rule and needs human judgement.\n"
    "- 'evidence_type': the artefact that proves compliance (e.g. board resolution, filed return, "
    "system report, policy document, training record)."
)


def _rule_id() -> str:
    return uuid.uuid4().hex


def generate_rule(obligation: Obligation) -> ComplianceRule:
    user_prompt = (
        f"Obligation: {obligation.description}\n"
        f"Source text: \"{obligation.source_text}\"\n"
        f"Stated deadline hint: {obligation.deadline_hint or 'none'}\n"
        f"Functional area: {obligation.functional_area.value}\n\n"
        "Produce the compliance rule as JSON."
    )
    try:
        llm_rule: ComplianceRuleLLM = structured_complete(
            SYSTEM_PROMPT, user_prompt, ComplianceRuleLLM
        )
    except StructuredOutputError:
        llm_rule = ComplianceRuleLLM(
            rule_type=RuleType.PROCESS_ADHERENCE,
            evaluation_criterion=obligation.description,
            is_qualitative=True,
            evidence_type="manual evidence",
        )
    return ComplianceRule(
        rule_id=_rule_id(),
        obligation_id=obligation.identifier,
        **llm_rule.model_dump(),
    )


def generate_rules(obligations: list[Obligation]) -> dict[str, ComplianceRule]:
    """Return a mapping of obligation identifier -> generated rule."""
    return {ob.identifier: generate_rule(ob) for ob in obligations}
