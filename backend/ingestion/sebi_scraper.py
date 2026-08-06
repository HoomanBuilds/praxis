"""SEBI Circular Auto-Monitor (§Part C).

Scrapes the SEBI Circulars index page using BeautifulSoup, downloads new PDFs,
deduplicates by URL hash, and feeds them into the ingestion pipeline.

This is a *scraper against a public government website*, not an official SEBI feed
or API — no such public API exists. It is deliberately a polite client:

* ``robots.txt`` is fetched and honoured for every URL before it is requested; a
  disallowed URL is skipped, and if robots.txt itself cannot be read the run is
  abandoned rather than assuming permission.
* Every outbound request is spaced by at least ``_MIN_REQUEST_DELAY`` seconds
  (or the site's declared ``Crawl-delay``, whichever is larger).
* The poll interval defaults to 6 hours and each run caps how many PDFs it will
  pull, so a cold start cannot stampede SEBI's infrastructure.

The scraper is started as a daemon thread from `api/main.py` at startup and is a
graceful no-op when the site is unreachable.
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
import tempfile
import threading
import time
import urllib.robotparser
from datetime import datetime, timezone
from urllib.parse import urljoin

logger = logging.getLogger("sebi_scraper")

SEBI_ORIGIN = "https://www.sebi.gov.in"
# SEBI's live listing endpoint. ssid selects the section: 7 = Circulars,
# 6 = Master Circulars. (The older /web/guest/* paths 404 — SEBI retired them.)
SEBI_CIRCULARS_URL = f"{SEBI_ORIGIN}/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=7&smid=0"
SEBI_MASTER_URL = f"{SEBI_ORIGIN}/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=6&smid=0"
ROBOTS_URL = f"{SEBI_ORIGIN}/robots.txt"

# Listing rows link to /legal/circulars/<mon-year>/<slug>_<id>.html detail pages.
_DETAIL_PATH_RE = re.compile(r"/legal/(?:circulars|master-circulars)/[^/]+/[^/]+\.html$", re.I)
# The detail page embeds the PDF as <iframe src="../../../web/?file=<absolute pdf url>">.
_PDF_IN_IFRAME_RE = re.compile(r"file=(https?://[^\s'\"&]+\.pdf)", re.I)
_ATTACHDOC_RE = re.compile(r"/sebi_data/attachdocs/[^\s'\"]+\.pdf", re.I)
_LISTING_DATE_RE = re.compile(r"[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}")


def _absolute(url: str) -> str:
    """Resolve a possibly-relative SEBI URL against the site origin."""
    url = (url or "").strip()
    if url.startswith("http"):
        return url
    if url.startswith("//"):
        return f"https:{url}"
    if url.startswith("/"):
        return f"{SEBI_ORIGIN}{url}"
    return urljoin(f"{SEBI_ORIGIN}/", url.lstrip("./"))

# Polling interval in seconds (default: 6 hours).  Override via env var.
_DEFAULT_INTERVAL_SECS = int(os.getenv("SEBI_POLL_INTERVAL_SECS", str(6 * 3600)))

# Politeness: minimum seconds between two outbound requests to sebi.gov.in, and the
# ceiling on how many new PDFs a single run will download.
_MIN_REQUEST_DELAY = float(os.getenv("SEBI_REQUEST_DELAY_SECS", "3"))
# Kept deliberately small: each ingested circular runs a full LLM extraction, and
# firing a large batch back-to-back will exhaust a local Ollama runner. New circulars
# trickle in over the following runs rather than stampeding on first boot.
_MAX_DOWNLOADS_PER_RUN = int(os.getenv("SEBI_MAX_DOWNLOADS_PER_RUN", "3"))
# Breathing room between two LLM-heavy extractions.
_EXTRACT_COOLDOWN = float(os.getenv("SEBI_EXTRACT_COOLDOWN_SECS", "5"))

_UA_TOKEN = "PRAXIS-Compliance"
_HEADERS = {
    "User-Agent": (
        f"Mozilla/5.0 (compatible; {_UA_TOKEN}/1.0; +https://praxis.local/bot)"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
}

# ---------------------------------------------------------------------------
# Politeness helpers: robots.txt + inter-request throttle.
# ---------------------------------------------------------------------------

_robots: urllib.robotparser.RobotFileParser | None = None
_robots_fetched_at: float = 0.0
_ROBOTS_TTL = 24 * 3600
_last_request_at: float = 0.0
_throttle_lock = threading.Lock()


def _get_robots() -> urllib.robotparser.RobotFileParser | None:
    """Fetch (and cache for a day) SEBI's robots.txt. None means 'unknown'."""
    global _robots, _robots_fetched_at
    if _robots is not None and (time.monotonic() - _robots_fetched_at) < _ROBOTS_TTL:
        return _robots
    try:
        import requests

        resp = requests.get(ROBOTS_URL, headers=_HEADERS, timeout=15)
        resp.raise_for_status()
        parser = urllib.robotparser.RobotFileParser()
        parser.parse(resp.text.splitlines())
        _robots = parser
        _robots_fetched_at = time.monotonic()
        return _robots
    except Exception as exc:
        logger.warning("Could not read robots.txt (%s) — treating as disallowed", exc)
        return None


def _may_fetch(url: str) -> bool:
    """True only when robots.txt affirmatively permits this URL.

    Fails closed: an unreadable robots.txt means we do not crawl at all.
    """
    robots = _get_robots()
    if robots is None:
        return False
    return robots.can_fetch(_UA_TOKEN, url)


def _crawl_delay() -> float:
    """The site's declared Crawl-delay, floored at our own minimum."""
    robots = _get_robots()
    declared = 0.0
    if robots is not None:
        try:
            value = robots.crawl_delay(_UA_TOKEN)
            declared = float(value) if value else 0.0
        except Exception:
            declared = 0.0
    return max(_MIN_REQUEST_DELAY, declared)


def _throttle() -> None:
    """Block until at least the crawl delay has elapsed since the last request."""
    global _last_request_at
    with _throttle_lock:
        delay = _crawl_delay()
        elapsed = time.monotonic() - _last_request_at
        if _last_request_at and elapsed < delay:
            time.sleep(delay - elapsed)
        _last_request_at = time.monotonic()


def _polite_get(url: str, **kwargs):
    """robots-checked, throttled GET. Raises PermissionError when disallowed."""
    import requests

    if not _may_fetch(url):
        raise PermissionError(f"robots.txt disallows {url}")
    _throttle()
    return requests.get(url, headers=_HEADERS, timeout=kwargs.pop("timeout", 15), **kwargs)

# ---------------------------------------------------------------------------
# State shared between the background thread and the /api/watch/sebi-status
# endpoint.
# ---------------------------------------------------------------------------

_state: dict = {
    "last_checked_at": None,   # ISO-8601 string or None
    "last_error": None,        # error message string or None
    "new_hits_since_reset": 0, # count of new circulars found in the last run
    "total_ingested": 0,       # cumulative count across all runs
}
_state_lock = threading.Lock()
_started = False
_started_lock = threading.Lock()


def get_state() -> dict:
    """Return a copy of the current scraper state (thread-safe)."""
    with _state_lock:
        return dict(_state)


def _url_hash(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:32]


def _fetch_circular_links(index_url: str) -> list[dict]:
    """Return [{title, url, date_text}] from a SEBI circulars index page."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        logger.warning("beautifulsoup4 not installed — SEBI scraper disabled")
        return []

    try:
        resp = _polite_get(index_url)
        resp.raise_for_status()
    except PermissionError as exc:
        logger.warning("Skipping index — %s", exc)
        return []
    except Exception as exc:
        logger.warning("SEBI index fetch failed (%s): %s", index_url, exc)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results: list[dict] = []
    seen: set[str] = set()

    # The listing links to per-circular HTML detail pages under /legal/..., not to
    # PDFs directly. Each row carries the title and the publication date.
    for a_tag in soup.find_all("a", href=True):
        href = _absolute(a_tag["href"])
        if not _DETAIL_PATH_RE.search(href) or href in seen:
            continue
        seen.add(href)

        title_text = a_tag.get_text(strip=True)
        if not title_text:
            continue

        # The date sits in a sibling cell (table layout) or a nearby <td>/<li>.
        date_text = ""
        row = a_tag.find_parent("tr") or a_tag.find_parent("li")
        if row:
            cells = row.find_all("td")
            if cells:
                date_text = cells[0].get_text(strip=True)
        if not date_text:
            m = _LISTING_DATE_RE.search(row.get_text(" ", strip=True) if row else "")
            date_text = m.group(0) if m else ""

        results.append({"title": title_text, "detail_url": href, "date_text": date_text})

    return results


def _resolve_pdf(detail_url: str) -> dict:
    """Second stage: open a circular's detail page and pull out the real PDF URL.

    SEBI embeds the document in an ``<iframe src='../../../web/?file=<pdf url>'>``
    under ``/sebi_data/attachdocs/``. The page also carries the official circular
    number, which is a far better document reference than a URL hash.

    Returns ``{"pdf_url": ..., "circular_no": ...}``; ``pdf_url`` is empty when the
    circular has no attached PDF (some are HTML-only).
    """
    from bs4 import BeautifulSoup

    out = {"pdf_url": "", "circular_no": ""}
    try:
        resp = _polite_get(detail_url, timeout=20)
        resp.raise_for_status()
    except PermissionError as exc:
        logger.warning("Skipping detail page — %s", exc)
        return out
    except Exception as exc:
        logger.warning("Detail page fetch failed (%s): %s", detail_url, exc)
        return out

    soup = BeautifulSoup(resp.text, "html.parser")

    for frame in soup.find_all("iframe", src=True):
        m = _PDF_IN_IFRAME_RE.search(frame["src"])
        if m:
            out["pdf_url"] = _absolute(m.group(1))
            break
    if not out["pdf_url"]:
        link = soup.find("a", href=_ATTACHDOC_RE)
        if link:
            out["pdf_url"] = _absolute(link["href"])

    # "Circular No.:" label followed by the number in the next span.
    for span in soup.find_all("span"):
        if "circular no" in span.get_text(strip=True).lower():
            nxt = span.find_next_sibling("span")
            if nxt:
                out["circular_no"] = nxt.get_text(strip=True)
            break

    return out


MONITORED_SOURCES = [
    (SEBI_CIRCULARS_URL, "SEBI Circulars"),
    (SEBI_MASTER_URL, "SEBI Master Circulars"),
]


def _ensure_source(session, name: str, url: str):
    """Get-or-create the WatchSource row backing one scraped index page."""
    from db import crud

    for src in crud.list_watch_sources(session):
        if src.url == url:
            return src
    return crud.create_watch_source(session, name=name, url=url, source_type="regulatory")


def _run_once() -> int:
    """Perform one scrape-and-ingest cycle.  Returns number of new documents ingested.

    Each newly discovered circular is recorded as a ``WatchHit`` before ingestion, so
    the Watch page shows what the monitor actually found even if a later download or
    parse fails. ``WatchSource.last_checked_at`` is stamped per source so "last
    checked" survives a restart (the in-memory state dict does not).
    """
    # Inline import to avoid circular import at module load time.
    from db.session import get_session_factory
    import services
    from db import crud

    new_count = 0
    downloads = 0
    SessionFactory = get_session_factory()

    for source_url, source_name in MONITORED_SOURCES:
        links = _fetch_circular_links(source_url)
        logger.info("Fetched %d links from %s", len(links), source_name)

        with SessionFactory() as session:
            source = _ensure_source(session, source_name, source_url)
            source_id = source.id
            source.last_checked_at = datetime.now(timezone.utc)
            session.commit()

        for item in links:
            if downloads >= _MAX_DOWNLOADS_PER_RUN:
                logger.info("Download cap (%d) reached — deferring the rest to the next run",
                            _MAX_DOWNLOADS_PER_RUN)
                break

            detail_url = item["detail_url"]

            with SessionFactory() as session:
                existing_docs = crud.list_documents(session)
                already_seen = any(
                    (getattr(d, "source_url", None) or "") == detail_url
                    for d in existing_docs
                )
                if already_seen:
                    continue
                # Record the detection before doing any further work, so a circular
                # SEBI published is visible in Regulatory Watch even if the download
                # or extraction later fails.
                already_hit = any(
                    h.url == detail_url for h in crud.list_watch_hits(session, source_id=source_id)
                )
                if not already_hit:
                    crud.create_watch_hit(
                        session,
                        source_id=source_id,
                        title=item["title"],
                        url=detail_url,
                        summary=f"New circular on {source_name}"
                                + (f" · {item['date_text']}" if item.get("date_text") else ""),
                    )
                    session.commit()

            # Stage 2: the listing has no PDF link — resolve it from the detail page.
            resolved = _resolve_pdf(detail_url)
            pdf_url = resolved["pdf_url"]
            if not pdf_url:
                logger.info("No PDF attached to %s — detected only, manual import needed", detail_url)
                continue

            # Download the PDF to a temp file (robots-checked and throttled).
            tmp_path = None
            try:
                resp = _polite_get(pdf_url, timeout=60, stream=True)
                resp.raise_for_status()
                downloads += 1
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    for chunk in resp.iter_content(65536):
                        tmp.write(chunk)
                    tmp_path = tmp.name
            except PermissionError as exc:
                logger.warning("Skipping download — %s", exc)
                continue
            except Exception as exc:
                logger.warning("Could not download %s: %s", pdf_url, exc)
                continue

            # Prefer SEBI's official circular number as the document reference; fall
            # back to a URL hash only when the page didn't carry one.
            reference = resolved["circular_no"] or _url_hash(detail_url)[:16]

            # Ingest first and commit, so the document survives even if the LLM
            # extraction that follows fails.
            doc_id = None
            try:
                with SessionFactory() as session:
                    doc, created = services.ingest_file(
                        session,
                        tmp_path,
                        reference=reference,
                        title=item["title"],
                        source_url=detail_url,
                        actor="sebi_scraper",
                    )
                    session.commit()
                    doc_id = doc.id if created else None
            except Exception as exc:
                logger.warning("Ingest failed for %s: %s", detail_url, exc)
            finally:
                if tmp_path:
                    try:
                        os.unlink(tmp_path)
                    except OSError:
                        pass

            if not doc_id:
                continue

            # Extraction is a separate transaction. A failure here (typically the
            # local model being unavailable) must leave a visible, retryable state
            # rather than a document silently stuck with zero obligations.
            try:
                with SessionFactory() as session:
                    services.process_document(session, doc_id)
                    session.commit()
                new_count += 1
                logger.info("Ingested new circular: %s (%s)", item["title"], reference)
            except Exception as exc:
                logger.warning("Extraction failed for %s: %s", detail_url, exc)
                try:
                    with SessionFactory() as session:
                        d = crud.get_document(session, doc_id)
                        if d:
                            import schemas
                            d.status = schemas.DocumentStatus.EXTRACTION_FAILED.value
                            session.commit()
                except Exception:
                    pass
            time.sleep(_EXTRACT_COOLDOWN)

    return new_count


def run_once_now() -> int:
    """Synchronous single scrape cycle for the manual 'Check now' endpoint.

    Updates the same shared state the background loop reports, so the UI's "last
    checked" reflects a manual run too.
    """
    try:
        ingested = _run_once()
    except Exception as exc:
        with _state_lock:
            _state["last_checked_at"] = datetime.now(timezone.utc).isoformat()
            _state["last_error"] = str(exc)
        raise
    with _state_lock:
        _state["last_checked_at"] = datetime.now(timezone.utc).isoformat()
        _state["new_hits_since_reset"] = ingested
        _state["total_ingested"] += ingested
        _state["last_error"] = None
    return ingested


def _loop(interval_secs: int) -> None:
    """Background thread: run forever, scraping on the given interval."""
    logger.info("SEBI scraper started (interval=%ds)", interval_secs)
    while True:
        try:
            new_count = _run_once()
            with _state_lock:
                _state["last_checked_at"] = datetime.now(timezone.utc).isoformat()
                _state["new_hits_since_reset"] = new_count
                _state["total_ingested"] += new_count
                _state["last_error"] = None
        except Exception as exc:
            logger.error("SEBI scraper run failed: %s", exc, exc_info=True)
            with _state_lock:
                _state["last_checked_at"] = datetime.now(timezone.utc).isoformat()
                _state["last_error"] = str(exc)
        time.sleep(interval_secs)


def start_sebi_monitor(interval_secs: int = _DEFAULT_INTERVAL_SECS) -> None:
    """Start the background scraper thread.  Safe to call multiple times (idempotent)."""
    global _started
    with _started_lock:
        if _started:
            return
        _started = True
    t = threading.Thread(target=_loop, args=(interval_secs,), daemon=True, name="sebi-monitor")
    t.start()
    logger.info("SEBI monitor thread started")
