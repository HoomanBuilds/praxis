"""Pluggable LLM client with schema-validated structured output (proposal §7.6).

Default provider is Ollama running a local open-weight model (``llama3.1:8b``), so no
regulatory content leaves the client boundary (§10.4). The model is constrained to emit
JSON conforming to a Pydantic schema; output is validated before it enters the pipeline.
On a validation failure the call is retried once with an error-correction message; a second
failure raises ``StructuredOutputError`` so the caller can route the item to human review.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Type, TypeVar

import ollama as _ollama
from pydantic import BaseModel, ValidationError

from config import settings

T = TypeVar("T", bound=BaseModel)


class StructuredOutputError(RuntimeError):
    """Raised when the model cannot produce schema-valid output after retries."""


@dataclass
class LLMResult:
    """Result from a structured LLM call, including the raw pre-validation response."""
    parsed: BaseModel
    raw: str


def _get_client() -> _ollama.Client:
    return _ollama.Client(host=settings.ollama_host)


def _content_to_str(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, bytes):
        return content.decode("utf-8", errors="replace")
    if isinstance(content, list):
        return "".join(part.get("text", "") if isinstance(part, dict) else str(part) for part in content)
    return str(content)


def structured_complete(
    system_prompt: str,
    user_prompt: str,
    schema: Type[T],
    retries: int = 1,
    temperature: float | None = None,
) -> LLMResult:
    """Return a validated instance of ``schema`` from the model, wrapped in ``LLMResult``
    which also carries the raw pre-validation response for audit logging (C4)."""
    client = _get_client()
    schema_json = schema.model_json_schema()
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    last_error: Exception | None = None
    for _ in range(retries + 1):
        response = client.chat(
            model=settings.llm_model,
            messages=messages,
            format=schema_json,
            keep_alive=settings.llm_keep_alive,
            options={
                "temperature": settings.llm_temperature if temperature is None else temperature,
                "num_ctx": settings.llm_num_ctx,
            },
        )
        raw = _content_to_str(response["message"]["content"]).strip()
        try:
            data = json.loads(raw)
            parsed = schema.model_validate(data)
            return LLMResult(parsed=parsed, raw=raw)
        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = exc
            messages.append({"role": "assistant", "content": raw})
            messages.append({
                "role": "user",
                "content": (
                    "Your previous response did not validate against the required JSON "
                    f"schema. Error: {exc}. Respond again with ONLY a single valid JSON "
                    "object conforming exactly to the schema. No prose, no markdown."
                ),
            })
    raise StructuredOutputError(f"schema={schema.__name__}: {last_error}")


def complete(system_prompt: str, user_prompt: str, temperature: float | None = None) -> str:
    """Free-text completion (used sparingly; most stages use structured output)."""
    client = _get_client()
    response = client.chat(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        keep_alive=settings.llm_keep_alive,
        options={
            "temperature": settings.llm_temperature if temperature is None else temperature,
            "num_ctx": settings.llm_num_ctx,
        },
    )
    return _content_to_str(response["message"]["content"]).strip()


def health_check() -> dict:
    """Verify the configured model is reachable on the Ollama host."""
    client = _get_client()
    models = client.list().get("models", [])
    names = [m.get("model") or m.get("name") for m in models]
    return {
        "provider": settings.llm_provider,
        "host": settings.ollama_host,
        "model": settings.llm_model,
        "available": any(settings.llm_model in (n or "") for n in names),
        "models": names,
    }
