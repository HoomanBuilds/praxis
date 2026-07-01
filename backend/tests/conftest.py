"""Pytest fixtures — isolate the database and vector store to temp paths so tests are
hermetic and never touch the developer's working data. LLM-dependent agents are not
exercised here; tests cover the deterministic layers (parsing, chunking, retrieval,
workflow/evidence mapping, persistence, API)."""
from __future__ import annotations

import pytest

from config import settings


@pytest.fixture(scope="session", autouse=True)
def isolate_storage(tmp_path_factory):
    db_path = tmp_path_factory.mktemp("db") / "test.db"
    settings.database_url = f"sqlite:///{db_path}"

    from db import session as db_session

    db_session._engine = None
    db_session._SessionLocal = None
    db_session.init_db()
    yield
