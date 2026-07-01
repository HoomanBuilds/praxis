"""Evidence Mapping Agent (proposal §6.2.6).

Defines the specific evidence artefacts required to demonstrate compliance with each
obligation, drawing on a library of evidence templates keyed by rule type and obligation
content (board resolutions, policy documents, system reports, filed returns, training
records, etc.). Each evidence requirement specifies the document type, the required
content, the responsible collector and a retention period.
"""
from __future__ import annotations

import uuid

from agents.workflow_mapping import _area_config, load_org_config
from schemas import ComplianceRule, EvidenceRequirement, Obligation, RuleType

# Evidence templates by rule type (document_type, required_content).
_TEMPLATES: dict[RuleType, tuple[str, str]] = {
    RuleType.DEADLINE: (
        "Filing acknowledgement / confirmation",
        "Dated acknowledgement or confirmation evidencing the action was completed by the deadline.",
    ),
    RuleType.THRESHOLD: (
        "System configuration report / screenshot",
        "System report or screenshot showing the configured value meets the regulatory threshold.",
    ),
    RuleType.DOCUMENTATION: (
        "Board-approved policy document",
        "The approved policy/procedure document with the date of board approval recorded.",
    ),
    RuleType.PERIODIC_FILING: (
        "Periodic filing / submission receipt",
        "Copy of each periodic report/return filed with the receipt or submission reference.",
    ),
    RuleType.PROCESS_ADHERENCE: (
        "Process note / SOP and sample records",
        "Documented SOP plus a sample of operational records demonstrating the process is followed.",
    ),
}


def _req_id() -> str:
    return uuid.uuid4().hex


def map_evidence(
    obligations: list[Obligation], rules: dict[str, ComplianceRule]
) -> list[EvidenceRequirement]:
    org = load_org_config()
    requirements: list[EvidenceRequirement] = []

    for ob in obligations:
        rule = rules.get(ob.identifier)
        rule_type = rule.rule_type if rule else RuleType.PROCESS_ADHERENCE
        doc_type, content = _TEMPLATES[rule_type]
        # Prefer the rule's own evidence_type when the model named a specific artefact.
        if rule and rule.evidence_type and rule.evidence_type.lower() not in {"manual evidence", ""}:
            doc_type = rule.evidence_type

        cfg = _area_config(org, ob.functional_area.value)
        requirements.append(
            EvidenceRequirement(
                requirement_id=_req_id(),
                obligation_id=ob.identifier,
                document_type=doc_type,
                required_content=content,
                collector=cfg.get("primary_owner", ""),
                retention_period="5 years",
            )
        )

        # A board-approved obligation additionally needs the board resolution as evidence.
        text = f"{ob.source_text} {ob.description}".lower()
        if "board" in text and rule_type != RuleType.DOCUMENTATION:
            requirements.append(
                EvidenceRequirement(
                    requirement_id=_req_id(),
                    obligation_id=ob.identifier,
                    document_type="Board resolution",
                    required_content="Minuted board resolution approving the policy/implementation.",
                    collector=_area_config(org, "legal").get("primary_owner", "Company Secretary"),
                    retention_period="8 years",
                )
            )
    return requirements
