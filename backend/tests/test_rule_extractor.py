from preprocessing.rule_extractor import extract_deterministic, needs_llm, route_section
from schemas import FunctionalArea, ParsedSection


def S(text: str) -> ParsedSection:
    return ParsedSection(label="1", text=text)


def test_needs_llm_only_for_qualitative_language():
    assert needs_llm(S("The intermediary shall maintain adequate systems and controls "
                       "commensurate with the nature and size of its operations."))
    assert not needs_llm(S("The intermediary shall submit the report within fifteen days."))


def test_deterministic_extracts_mandatory_sentence_with_deadline():
    obs = extract_deterministic(
        S("The stock broker shall submit a compliance certificate within fifteen days "
          "to the stock exchange concerned.")
    )
    assert len(obs) == 1
    assert obs[0].source_quote.startswith("The stock broker shall submit")
    assert obs[0].deadline_hint and "fifteen days" in obs[0].deadline_hint


def test_route_sends_qualitative_section_to_llm():
    obs, to_llm = route_section(
        S("The board shall ensure adequate and appropriate oversight of the risk "
          "management framework of the intermediary.")
    )
    assert to_llm is True and obs is None


def test_route_handles_clear_section_deterministically_with_area():
    obs, to_llm = route_section(
        S("The depository participant shall reconcile client securities with depository "
          "records on a daily basis and report discrepancies.")
    )
    assert to_llm is False
    assert obs and obs[0].functional_area == FunctionalArea.OPERATIONS


def test_commencement_boilerplate_is_not_an_obligation():
    assert extract_deterministic(S("The provisions of this circular shall come into force "
                                   "with immediate effect.")) == []
    assert extract_deterministic(S("This circular shall come into force from the date of "
                                   "its issuance.")) == []
    # A genuine duty next to boilerplate still extracts.
    obs = extract_deterministic(S("The intermediary shall maintain records for five years. "
                                  "This circular shall come into force with immediate effect."))
    assert len(obs) == 1 and "maintain records" in obs[0].source_quote
