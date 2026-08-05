"""Central configuration for PRAXIS.

All settings are read from environment variables (prefix ``PRAXIS_``) with local-dev
defaults, so the system runs out of the box for CLI use and is overridden by
docker-compose for the full stack.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root = two levels up from this file: backend/config.py -> repo root
REPO_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PRAXIS_",
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- LLM ---
    llm_provider: str = "ollama"
    ollama_host: str = "http://localhost:11434"
    llm_model: str = "llama3.1:8b"
    llm_temperature: float = 0.0
    llm_num_ctx: int = 8192
    llm_request_timeout: int = 300
    llm_keep_alive: str = "30m"  # keep the model resident between pipeline calls

    # --- Embeddings ---
    embedding_model: str = "sentence-transformers/all-mpnet-base-v2"

    # --- Vector store ---
    chroma_host: str = ""  # empty -> embedded persistent client
    chroma_port: int = 8000
    chroma_path: str = str(REPO_ROOT / "data" / "chroma")

    # --- Relational DB ---
    # Local default is SQLite so the CLI / tests run with zero setup. docker-compose
    # overrides PRAXIS_DATABASE_URL to the Postgres service for the full stack.
    database_url: str = f"sqlite:///{REPO_ROOT / 'data' / 'praxis.db'}"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"
    redis_stream: str = "praxis:document.process"
    redis_group: str = "praxis-workers"

    # --- Storage ---
    doc_store_path: str = str(REPO_ROOT / "data" / "documents")
    corpus_path: str = str(REPO_ROOT / "data" / "corpus")
    org_config_path: str = str(REPO_ROOT / "data" / "org_config.json")
    export_path: str = str(REPO_ROOT / "data" / "exports")

    # --- Pipeline thresholds (proposal §6, §7) ---
    parse_quality_min: float = 0.70
    ocr_trigger_quality: float = 0.80
    obligation_confidence_min: float = 0.65

    # --- Environment ---
    # "production" enables the startup guard that refuses to boot with a placeholder
    # api_key/jwt_secret (see api/main.py _check_production_secrets) and skips seeding
    # the demo admin account. Local dev / tests stay on the "development" default.
    environment: str = "development"

    # --- Authentication ---
    api_key: str = ""  # Empty = no service API key issued (local dev / tests).
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # --- Audit ---
    audit_retention_days: int = 2555  # ~7 years, SEBI requirement

    # --- Logging ---
    log_level: str = "INFO"

    # --- Retrieval ---
    retrieval_top_k: int = 6
    rrf_k: int = 60

    # --- Integrations (Tier 1-3) ---
    # Encryption at rest for integration credentials. Set a fixed value to make the
    # key stable across restarts; otherwise one is generated and persisted locally.
    integration_encryption_key: str = ""
    integration_key_path: str = str(REPO_ROOT / "data" / "integration.key")

    # SSO (OIDC / Keycloak) — validated against the demo Keycloak realm in
    # docker-compose, not a live enterprise IdP.
    frontend_url: str = "http://localhost:5173"
    sso_redirect_uri: str = "http://localhost:8080/api/auth/sso/callback"
    keycloak_url: str = "http://localhost:8081"
    keycloak_realm: str = "praxis"
    keycloak_client_id: str = "praxis-web"
    keycloak_client_secret: str = "praxis-demo-secret"  # demo realm client secret (localhost only)

    # Google Drive (Tier 2) — OAuth client from a Google Cloud test project.
    drive_oauth_client_id: str = ""
    drive_oauth_client_secret: str = ""
    drive_oauth_redirect_uri: str = "http://localhost:8080/api/auth/drive/callback"
    drive_oauth_auth_uri: str = "https://accounts.google.com/o/oauth2/v2/auth"
    drive_oauth_token_uri: str = "https://oauth2.googleapis.com/token"
    drive_oauth_scope: str = "https://www.googleapis.com/auth/drive.file"

    # DocuSign (Tier 2) — developer sandbox JWT grant.
    docusign_auth_base: str = "https://account-d.docusign.com"
    docusign_rest_base: str = "https://demo.docusign.net/restapi"
    docusign_integration_key: str = ""
    docusign_user_id: str = ""
    docusign_private_key: str = ""
    docusign_account_id: str = ""

    def ensure_dirs(self) -> None:
        """Create the local storage directories used by the running process."""
        for p in (
            self.doc_store_path,
            self.corpus_path,
            self.export_path,
            self.chroma_path,
        ):
            Path(p).mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_dirs()
    return settings


settings = get_settings()
