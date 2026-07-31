"""Hybrid extraction router (Layer 5/8) — deterministic first, LLM only when needed.

Most obligations in SEBI text are mechanically clear ("the broker shall maintain records",
"must submit a report within 15 days"). Those are extracted with a regex rule engine — no
model call. Only sections that contain genuinely qualitative or open-ended language
("adequate systems and controls", "appropriate oversight", "as may be specified") are routed
to the language model for reasoning. This keeps the LLM reserved for the ~10-20% of content
that actually needs it.

A section is routed as a whole: if it contains any qualitative marker it goes to the LLM
(which extracts all of its obligations); otherwise every mandatory sentence is extracted
deterministically. This avoids double-extracting the same paragraph.
"""
from __future__ import annotations

import re

from schemas import FunctionalArea, ModificationType, ObligationLLM, ParsedSection

_MANDATORY_RE = re.compile(r"\b(shall|must|is required to|are required to|mandatorily|required to)\b", re.I)

# Commencement / effective-date boilerplate that carries no actionable duty — every SEBI
# circular closes with it ("come into force", "with immediate effect"). Not an obligation.
_COMMENCEMENT_RE = re.compile(
    r"\b(come[s]?\s+into\s+(force|operation|effect)|shall\s+be\s+deemed\s+to\s+have\s+come\s+"
    r"into\s+(force|operation)|be\s+effective\s+(from|on)|with\s+immediate\s+effect|"
    r"provisions\s+of\s+this\s+(circular|regulation|notification)\s+(shall|will|would))\b",
    re.I,
)

# Open-ended / judgement language that needs a model, not a regex.
_QUALITATIVE_RE = re.compile(
    r"\b(adequate|appropriate|reasonabl|satisfactor|sufficient|suitable|commensurate|robust|"
    r"to the satisfaction|as may be (specified|required|necessary|determined)|best efforts|"
    r"fit and proper|as it deems|to the extent (necessary|possible))\b",
    re.I,
)

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.;])\s+(?=[A-Z(])")

_DEADLINE_RE = re.compile(
    r"(within\s+[\w-]+\s+(?:working\s+)?(?:days|day|months|month|hours|hour|weeks|week))"
    r"|(by\s+(?:the\s+)?(?:end\s+of\s+)?[A-Z][a-z]+\s+\d{1,2},?\s*\d{0,4})"
    r"|(not\s+later\s+than\s+[A-Z][a-z]+\s+\d{1,2},?\s*\d{0,4})"
    r"|(on\s+a\s+(?:daily|weekly|monthly|quarterly|half-yearly|yearly|annual)\s+basis)"
    r"|(every\s+(?:financial\s+year|quarter|month|two\s+years|\w+\s+years))"
    r"|((?:half-yearly|quarterly|monthly|annually|annual))",
    re.I,
)

# Functional-area keyword scoring.
_AREA_TERMS: dict[FunctionalArea, tuple[str, ...]] = {
    FunctionalArea.TECHNOLOGY: ("cyber", "vapt", "penetration", "system", "software", "data centre",
                                "network", "encryption", "audit log", "multi-factor", "disaster recovery",
                                "recovery time", "recovery point", "server", "technology"),
    FunctionalArea.OPERATIONS: ("margin pledge", "re-pledge", "settlement", "reconcil", "demat",
                                "collateral", "back-office", "depository record"),
    FunctionalArea.FINANCE: ("net worth", "capital", "deposit", "penalty", "margin", "risk management",
                             "financial"),
    FunctionalArea.CLIENT_SERVICES: ("client", "investor", "grievance", "complaint", "disclosure",
                                     "onboarding", "kyc", "scores"),
    FunctionalArea.LEGAL: ("agreement", "contract", "resolution", "confidential", "indemn", "legal"),
    FunctionalArea.HUMAN_RESOURCES: ("training", "dealing staff", "employee", "personnel competence"),
    FunctionalArea.COMPLIANCE: ("policy", "board", "compliance", "certificate", "filing", "return",
                                "monitor", "register", "record"),
}


def needs_llm(section: ParsedSection) -> bool:
    return bool(_QUALITATIVE_RE.search(section.text))


def _functional_area(text: str) -> FunctionalArea:
    lower = text.lower()
    best, best_score = FunctionalArea.COMPLIANCE, 0
    for area, terms in _AREA_TERMS.items():
        score = sum(1 for t in terms if t in lower)
        if score > best_score:
            best, best_score = area, score
    return best


def _deadline(text: str) -> str | None:
    m = _DEADLINE_RE.search(text)
    if not m:
        return None
    return next((g for g in m.groups() if g), None)


def _clean(sentence: str) -> str:
    return re.sub(r"\s+", " ", sentence).strip()


def extract_deterministic(section: ParsedSection) -> list[ObligationLLM]:
    """Regex-extract one obligation per mandatory sentence. Caller must have checked
    ``needs_llm`` is False first."""
    obligations: list[ObligationLLM] = []
    for raw_sentence in _SENTENCE_SPLIT_RE.split(section.text):
        sentence = _clean(raw_sentence)
        if len(sentence.split()) < 5 or not _MANDATORY_RE.search(sentence):
            continue
        if _COMMENCEMENT_RE.search(sentence):
            continue
        obligations.append(
            ObligationLLM(
                description=sentence,
                source_quote=sentence,
                functional_area=_functional_area(sentence),
                modification_type=ModificationType.NEW,
                confidence=0.9,  # pattern-matched, verbatim — calibrated downstream
                deadline_hint=_deadline(sentence),
            )
        )
    return obligations


def route_section(section: ParsedSection) -> tuple[list[ObligationLLM] | None, bool]:
    """Return (deterministic_obligations, route_to_llm).

    - (obligations, False): handled deterministically, no model call needed.
    - (None, True): contains qualitative language → send the whole section to the LLM.
    """
    if needs_llm(section):
        return None, True
    obligations = extract_deterministic(section)
    if not obligations:
        # Mandatory verb present but no clean sentence parsed — fall back to the LLM.
        return None, True
    return obligations, False
