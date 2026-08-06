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
    previous_api_key = settings.api_key
    previous_environment = settings.environment
    settings.database_url = f"sqlite:///{db_path}"
    settings.api_key = ""
    settings.environment = "development"

    from db import session as db_session

    db_session._engine = None
    db_session._SessionLocal = None
    db_session.init_db()
    yield
    settings.api_key = previous_api_key
    settings.environment = previous_environment


@pytest.fixture(scope="session", autouse=True)
def authed_test_client():
    """TestClient-based tests hit real routes but shouldn't need to log in — override
    require_user with a fixed admin actor, the same way a real deployment would use
    FastAPI's own dependency_overrides mechanism, not a backdoor in the app itself."""
    from api.deps import AuthedActor, require_user
    from api.main import app

    app.dependency_overrides[require_user] = lambda: AuthedActor(
        id="test-admin", email="test@praxis.local", role="admin", actor_label="test@praxis.local"
    )
    yield
    app.dependency_overrides.pop(require_user, None)
