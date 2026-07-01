from db.session import session_scope
from preprocessing.fingerprint import diff_sections, section_hash, store_fingerprints
from schemas import ParsedSection


def S(label: str, text: str) -> ParsedSection:
    return ParsedSection(label=label, text=text)


def test_hash_normalises_whitespace_and_case():
    assert section_hash(S("1", "The broker shall report.")) == \
        section_hash(S("1", "the   BROKER\n shall   report."))


def test_diff_classifies_new_changed_unchanged_across_reissue():
    fam = "fam-diff-test"
    v1 = [S("1", "alpha obligation text"), S("2", "beta obligation text")]

    # First release: everything is new; then persist fingerprints.
    with session_scope() as s:
        first = diff_sections(s, fam, v1)
        assert len(first.new) == 2 and not first.changed and not first.unchanged
        store_fingerprints(s, fam, "doc-v1", v1)

    # Re-issue: section 1 unchanged, section 2 amended, section 3 added.
    v2 = [S("1", "alpha obligation text"),
          S("2", "beta obligation text — AMENDED"),
          S("3", "gamma newly added text")]
    with session_scope() as s:
        d = diff_sections(s, fam, v2)

    assert [x.label for x in d.unchanged] == ["1"]
    assert [x.label for x in d.changed] == ["2"]
    assert [x.label for x in d.new] == ["3"]
    assert [x.label for x in d.to_process] == ["3", "2"]  # new + changed
    assert d.stats() == {"new": 1, "changed": 1, "unchanged_skipped": 1}
