"""Agent pipeline worker (proposal §5.2.2, §11.2).

A stateless consumer of the Redis ``document.process`` stream. For each event it runs
Phase A (parse -> regulation -> obligation extraction) and persists the result, leaving the
obligations in ``awaiting_review`` for the human-in-the-loop gate. The worker is the unit
that scales horizontally on queue depth; multiple instances share one consumer group.
"""
from __future__ import annotations

import os
import signal
import socket
import time

from config import settings
from db import crud
from db.session import init_db, session_scope
from ingestion.service import ensure_group, get_redis
from services import process_document

_RUNNING = True
_INTERRUPTED_STATUSES = {"parsing", "extracting", "generating"}


def _stop(*_):
    global _RUNNING
    _RUNNING = False


def _recover_interrupted_documents() -> int:
    recovered = 0
    with session_scope() as session:
        for document in crud.list_documents(session):
            if document.status not in _INTERRUPTED_STATUSES:
                continue
            crud.set_document_status(session, document, "extraction_failed")
            document.error = (
                "Processing was interrupted. Select Retry to process this regulation again."
            )
            recovered += 1
    return recovered


def run() -> None:
    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    init_db()
    recovered = _recover_interrupted_documents()
    if recovered:
        print(f"[worker] made {recovered} interrupted documents retryable")
    ensure_group()
    client = get_redis()
    consumer = f"{socket.gethostname()}-{os.getpid()}"
    print(f"[worker] started as {consumer}; consuming {settings.redis_stream}")

    while _RUNNING:
        try:
            resp = client.xreadgroup(
                settings.redis_group, consumer, {settings.redis_stream: ">"}, count=1, block=5000
            )
        except Exception as exc:
            print(f"[worker] redis read error: {exc}; retrying in 3s")
            time.sleep(3)
            continue

        if not resp:
            continue

        for _stream, messages in resp:
            for message_id, fields in messages:
                document_id = fields.get("document_id")
                print(f"[worker] processing document {document_id} (msg {message_id})")
                try:
                    with session_scope() as session:
                        result = process_document(session, document_id)
                    print(f"[worker] done: {result.get('status')} "
                          f"obligations={result.get('obligations', 0)}")
                except Exception as exc:  # keep the worker alive; surface the failure
                    print(f"[worker] ERROR processing {document_id}: {exc}")
                    try:
                        with session_scope() as session:
                            doc = crud.get_document(session, document_id)
                            if doc and doc.status in {"queued", "parsing", "extracting"}:
                                crud.set_document_status(session, doc, "failed")
                                doc.error = str(exc)[:400]
                    except Exception as status_exc:
                        print(f"[worker] ERROR recording failure for {document_id}: {status_exc}")
                finally:
                    client.xack(settings.redis_stream, settings.redis_group, message_id)

    print("[worker] shutting down")


if __name__ == "__main__":
    run()
