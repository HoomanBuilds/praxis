"""App-wide logging setup, called once at startup (api/main.py lifespan).

Every module already does the right thing — ``logging.getLogger(__name__)`` — but
nothing ever configured the root logger, so those calls had no handler/formatter and a
default level that silently dropped most of them. Adds a request-ID so log lines from
the same request can be correlated.
"""
from __future__ import annotations

import contextvars
import logging
import uuid

from config import settings

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class _RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s [%(request_id)s] [%(name)s] %(message)s"
    ))
    handler.addFilter(_RequestIdFilter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.log_level.upper())


def new_request_id() -> str:
    return uuid.uuid4().hex[:12]
