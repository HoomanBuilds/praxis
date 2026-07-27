"""Central configuration for PRAXIS / RegPilot.

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

    # --- Authentication ---
    api_key: str = ""  # Empty = auth disabled (local dev / tests). Set a value to enforce.

    # --- Audit ---
    audit_retention_days: int = 2555  # ~7 years, SEBI requirement

    # --- Retrieval ---
    retrieval_top_k: int = 6
    rrf_k: int = 60

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
