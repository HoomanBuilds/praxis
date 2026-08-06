import pytest
from fastapi.testclient import TestClient

from api.deps import require_user
from api.main import app
from config import settings
from db import crud
from db.session import session_scope


@pytest.fixture(autouse=True)
def use_real_authentication():
    previous_override = app.dependency_overrides.pop(require_user, None)
    yield
    if previous_override is not None:
        app.dependency_overrides[require_user] = previous_override


def test_protected_api_accepts_browser_bearer_token():
    email = "browser-auth@praxis.test"
    password = "correct-horse-battery-staple"
    with session_scope() as session:
        user = crud.get_user_by_email(session, email)
        if not user:
            crud.create_user(session, email, "Browser User", password, role="admin")

    previous_api_key = settings.api_key
    settings.api_key = "production-api-key"
    try:
        client = TestClient(app)
        login = client.post("/api/auth/login", json={"email": email, "password": password})
        assert login.status_code == 200
        token = login.json()["access_token"]

        response = client.get(
            "/api/dashboard/summary",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
    finally:
        settings.api_key = previous_api_key


def test_protected_api_rejects_missing_credentials_in_production():
    previous_api_key = settings.api_key
    settings.api_key = "production-api-key"
    try:
        response = TestClient(app).get("/api/dashboard/summary")
        assert response.status_code == 401
    finally:
        settings.api_key = previous_api_key
