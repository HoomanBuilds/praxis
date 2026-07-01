from preprocessing.classifier import SectionKind, classify_section, filter_candidates
from schemas import ParsedSection


def S(text: str, heading: str | None = None, label: str = "1") -> ParsedSection:
    return ParsedSection(label=label, heading=heading, text=text)


def test_regulatory_section_with_mandatory_verb_proceeds():
    s = S("The stock broker shall maintain records of all client authorisations for a "
          "period of five years and preserve them for inspection by the exchange.")
    kind, _ = classify_section(s)
    assert kind == SectionKind.REGULATORY


def test_short_heading_dropped():
    kind, _ = classify_section(S("Applicability and Commencement"))
    assert kind == SectionKind.HEADING


def test_definition_pattern_dropped():
    s = S('"Associate" means any person controlled directly or indirectly by the '
          'intermediary and includes its subsidiaries and group entities.')
    kind, _ = classify_section(s)
    assert kind == SectionKind.DEFINITION


def test_annexure_heading_dropped_even_with_mandatory_verb():
    s = S("This format shall be used for the periodic report submitted to the exchange "
          "concerned under this circular as and when applicable to the intermediary.",
          heading="Annexure A - Format of Report")
    kind, _ = classify_section(s)
    assert kind == SectionKind.ANNEXURE


def test_table_of_contents_lines_dropped():
    s = S("Chapter 1 Introduction .......... 5\n"
          "Chapter 2 Registration Requirements .......... 12\n"
          "Chapter 3 Obligations of Intermediaries .......... 20")
    kind, _ = classify_section(s)
    assert kind == SectionKind.TABLE_OF_CONTENTS


def test_recital_without_duty_dropped():
    s = S("In exercise of the powers conferred under Section 11 of the SEBI Act, 1992, "
          "this circular is issued to protect the interests of investors in securities.")
    kind, _ = classify_section(s)
    assert kind == SectionKind.RECITAL


def test_filter_candidates_returns_only_regulatory_with_full_tally():
    sections = [
        S("The intermediary shall submit a report within fifteen days to the stock "
          "exchange regarding any material change to its registration details."),
        S('"Client" means a person who avails services from the intermediary and '
          'includes prospective clients seeking such services from it.'),
        S("Scope"),
    ]
    candidates, tally = filter_candidates(sections)
    assert len(candidates) == 1
    assert tally.get("regulatory") == 1
    assert sum(tally.values()) == 3  # every section is accounted for
