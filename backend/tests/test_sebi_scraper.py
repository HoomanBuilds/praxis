"""SEBI monitor tests — the politeness contract and link parsing.

The scraper hits a real government website, so the guarantees that matter are
behavioural: it must not request anything robots.txt disallows, it must fail closed
when robots.txt is unreadable, and it must space out its requests. These are tested
without any network access by stubbing the module's ``requests`` seam.
"""
from __future__ import annotations

import sys
import types

import pytest

from ingestion import sebi_scraper as scraper


ROBOTS_ALLOW_ALL = "User-agent: *\nDisallow:\n"
ROBOTS_DISALLOW_PDF = "User-agent: *\nDisallow: /sebi_data/\n"
ROBOTS_WITH_DELAY = "User-agent: *\nDisallow:\nCrawl-delay: 7\n"


class _Resp:
    def __init__(self, text="", status=200):
        self.text = text
        self.status_code = status

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


@pytest.fixture(autouse=True)
def _reset_scraper_state():
    """robots.txt and the throttle clock are module-level caches — reset per test."""
    scraper._robots = None
    scraper._robots_fetched_at = 0.0
    scraper._last_request_at = 0.0
    yield
    scraper._robots = None
    scraper._robots_fetched_at = 0.0
    scraper._last_request_at = 0.0


def _install_requests(monkeypatch, handler):
    """Install a fake ``requests`` module; scraper imports it inside functions."""
    fake = types.ModuleType("requests")
    fake.get = handler
    monkeypatch.setitem(sys.modules, "requests", fake)
    return fake


def test_disallowed_url_is_never_requested(monkeypatch):
    """robots.txt disallows /sebi_data/ — the PDF must not be fetched at all."""
    requested: list[str] = []

    def handler(url, **kwargs):
        requested.append(url)
        if url == scraper.ROBOTS_URL:
            return _Resp(ROBOTS_DISALLOW_PDF)
        return _Resp("<html></html>")

    _install_requests(monkeypatch, handler)
    monkeypatch.setattr(scraper, "_MIN_REQUEST_DELAY", 0)

    pdf = "https://www.sebi.gov.in/sebi_data/circular.pdf"
    assert scraper._may_fetch(pdf) is False
    with pytest.raises(PermissionError):
        scraper._polite_get(pdf)
    assert pdf not in requested  # only robots.txt was ever fetched
    assert requested == [scraper.ROBOTS_URL]


def test_unreadable_robots_fails_closed(monkeypatch):
    """If robots.txt cannot be read we must assume 'no', not 'yes'."""
    def handler(url, **kwargs):
        if url == scraper.ROBOTS_URL:
            raise OSError("network down")
        pytest.fail("must not request anything when robots.txt is unavailable")

    _install_requests(monkeypatch, handler)
    assert scraper._may_fetch("https://www.sebi.gov.in/web/guest/circulars") is False


def test_allowed_url_is_fetched(monkeypatch):
    def handler(url, **kwargs):
        if url == scraper.ROBOTS_URL:
            return _Resp(ROBOTS_ALLOW_ALL)
        return _Resp("<html>ok</html>")

    _install_requests(monkeypatch, handler)
    monkeypatch.setattr(scraper, "_MIN_REQUEST_DELAY", 0)
    resp = scraper._polite_get("https://www.sebi.gov.in/web/guest/circulars")
    assert resp.text == "<html>ok</html>"


def test_requests_are_throttled(monkeypatch):
    """Consecutive requests must be spaced by at least the crawl delay."""
    slept: list[float] = []

    def handler(url, **kwargs):
        return _Resp(ROBOTS_ALLOW_ALL if url == scraper.ROBOTS_URL else "<html></html>")

    _install_requests(monkeypatch, handler)
    monkeypatch.setattr(scraper, "_MIN_REQUEST_DELAY", 3.0)
    monkeypatch.setattr(scraper.time, "sleep", lambda s: slept.append(s))

    # Monotonic clock barely advances, so the throttle must insert a real sleep.
    ticks = iter([0.0, 100.0, 100.0, 100.1, 100.1, 100.1])
    monkeypatch.setattr(scraper.time, "monotonic", lambda: next(ticks))

    scraper._throttle()   # first call: no wait needed
    scraper._throttle()   # second call: only 0.1s elapsed → must sleep ~2.9s
    assert slept and slept[0] == pytest.approx(2.9, abs=0.05)


def test_site_crawl_delay_overrides_our_minimum(monkeypatch):
    """A site asking for 7s must win over our 3s floor."""
    def handler(url, **kwargs):
        return _Resp(ROBOTS_WITH_DELAY)

    _install_requests(monkeypatch, handler)
    monkeypatch.setattr(scraper, "_MIN_REQUEST_DELAY", 3.0)
    assert scraper._crawl_delay() == 7.0


# Shape of SEBI's live listing: rows link to per-circular HTML detail pages.
LISTING_HTML = """
<table>
  <tr><td>Jan 05, 2026</td>
      <td><a href="/legal/circulars/jan-2026/some-circular_101.html">Circular A</a></td></tr>
  <tr><td>Jan 06, 2026</td>
      <td><a href="https://www.sebi.gov.in/legal/circulars/jan-2026/other_102.html">Circular B</a></td></tr>
  <tr><td>x</td><td><a href="/sebiweb/home/HomeAction.do?doListing=yes">Ignore nav</a></td></tr>
  <tr><td>y</td><td><a href="javascript: showCircularArchive();">Ignore js</a></td></tr>
</table>
"""

# Shape of a detail page: PDF embedded in an iframe, circular number in a span pair.
DETAIL_HTML = """
<div class='id_area'><span>Circular No.:  </span><span>HO/(92)2026-IMD/16006/2026</span></div>
<div class='cover'>
  <iframe src='../../../web/?file=https://www.sebi.gov.in/sebi_data/attachdocs/jul-2026/178.pdf'
          title="x"></iframe>
</div>
"""


def test_parses_detail_page_links_from_listing(monkeypatch):
    def handler(url, **kwargs):
        return _Resp(ROBOTS_ALLOW_ALL if url == scraper.ROBOTS_URL else LISTING_HTML)

    _install_requests(monkeypatch, handler)
    monkeypatch.setattr(scraper, "_MIN_REQUEST_DELAY", 0)

    links = scraper._fetch_circular_links(scraper.SEBI_CIRCULARS_URL)
    urls = [item["detail_url"] for item in links]
    assert urls == [
        "https://www.sebi.gov.in/legal/circulars/jan-2026/some-circular_101.html",
        "https://www.sebi.gov.in/legal/circulars/jan-2026/other_102.html",
    ]
    assert links[0]["title"] == "Circular A"
    assert links[0]["date_text"] == "Jan 05, 2026"


def test_resolves_pdf_and_circular_number_from_detail_page(monkeypatch):
    """The PDF lives in an iframe 'file=' param, not an <a href> — the real shape."""
    def handler(url, **kwargs):
        return _Resp(ROBOTS_ALLOW_ALL if url == scraper.ROBOTS_URL else DETAIL_HTML)

    _install_requests(monkeypatch, handler)
    monkeypatch.setattr(scraper, "_MIN_REQUEST_DELAY", 0)

    out = scraper._resolve_pdf("https://www.sebi.gov.in/legal/circulars/jan-2026/x_1.html")
    assert out["pdf_url"] == "https://www.sebi.gov.in/sebi_data/attachdocs/jul-2026/178.pdf"
    assert out["circular_no"] == "HO/(92)2026-IMD/16006/2026"


def test_detail_page_without_pdf_returns_empty(monkeypatch):
    """Some circulars are HTML-only — that must be reported, not guessed at."""
    def handler(url, **kwargs):
        return _Resp(ROBOTS_ALLOW_ALL if url == scraper.ROBOTS_URL else "<div>no pdf here</div>")

    _install_requests(monkeypatch, handler)
    monkeypatch.setattr(scraper, "_MIN_REQUEST_DELAY", 0)
    assert scraper._resolve_pdf("https://www.sebi.gov.in/legal/circulars/a/b_1.html")["pdf_url"] == ""


def test_listing_urls_point_at_the_live_endpoint():
    """Guards the 404 regression: the retired /web/guest/* paths must not come back."""
    for url, _ in scraper.MONITORED_SOURCES:
        assert "/web/guest/" not in url
        assert "HomeAction.do" in url


def test_disallowed_index_yields_no_links(monkeypatch):
    def handler(url, **kwargs):
        if url == scraper.ROBOTS_URL:
            return _Resp("User-agent: *\nDisallow: /sebiweb/\n")
        pytest.fail("index must not be fetched when disallowed")

    _install_requests(monkeypatch, handler)
    assert scraper._fetch_circular_links(scraper.SEBI_CIRCULARS_URL) == []


def test_queue_document_publishes_to_worker(monkeypatch):
    from db import crud
    from db.session import get_session_factory, session_scope
    from ingestion import service

    with session_scope() as session:
        document = crud.create_document(
            session,
            reference="SEBI/QUEUE/SUCCESS",
            title="Queued circular",
            file_path="/tmp/queued-circular.pdf",
            content_hash="sebi-queue-success",
        )
        document_id = document.id

    published = []
    monkeypatch.setattr(service, "publish_process_event", published.append)

    assert scraper._queue_document(get_session_factory(), document_id) is True
    assert published == [document_id]
    with session_scope() as session:
        assert crud.get_document(session, document_id).status == "queued"


def test_queue_document_failure_is_retryable(monkeypatch):
    from db import crud
    from db.session import get_session_factory, session_scope
    from ingestion import service

    with session_scope() as session:
        document = crud.create_document(
            session,
            reference="SEBI/QUEUE/FAILURE",
            title="Unqueued circular",
            file_path="/tmp/unqueued-circular.pdf",
            content_hash="sebi-queue-failure",
        )
        document_id = document.id

    def fail_publish(_document_id):
        raise ConnectionError("redis unavailable")

    monkeypatch.setattr(service, "publish_process_event", fail_publish)

    assert scraper._queue_document(get_session_factory(), document_id) is False
    with session_scope() as session:
        document = crud.get_document(session, document_id)
        assert document.status == "extraction_failed"
        assert "Select Retry" in document.error
