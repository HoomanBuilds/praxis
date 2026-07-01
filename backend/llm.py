"""Pluggable LLM client with schema-validated structured output (proposal §7.6).

Default provider is Ollama running a local open-weight model (``llama3.1:8b``), so no
regulatory content leaves the client boundary (§10.4). The model is constrained to emit
JSON conforming to a Pydantic schema; output is validated before it enters the pipeline.
On a validation failure the call is retried once with an error-correction message; a second
failure raises ``StructuredOutputError`` so the caller can route the item to human review.
"""
from __future__ import annotations

import json
from typing import Type, TypeVar

from pydantic import BaseModel, ValidationError

from config import settings

T = TypeVar("T", bound=BaseModel)


class StructuredOutputError(RuntimeError):
    """Raised when the model cannot produce schema-valid output after retries."""


def _get_chat_model(format_schema: dict | None = None, temperature: float | None = None):
    if settings.llm_provider != "ollama":
        raise NotImplementedError(
            f"LLM provider '{settings.llm_provider}' is not wired in this build; use 'ollama'."
        )
    from langchain_ollama import ChatOllama

    return ChatOllama(
        model=settings.llm_model,
        base_url=settings.ollama_host,
        temperature=settings.llm_temperature if temperature is None else temperature,
        num_ctx=settings.llm_num_ctx,
        format=format_schema,
        client_kwargs={"timeout": settings.llm_request_timeout},
    )


def _content_to_str(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):  # some providers return content parts
        return "".join(part.get("text", "") if isinstance(part, dict) else str(part) for part in content)
    return str(content)


def structured_complete(
    system_prompt: str,
    user_prompt: str,
    schema: Type[T],
    retries: int = 1,
    temperature: float | None = None,
) -> T:
    """Return a validated instance of ``schema`` from the model."""
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

    schema_json = schema.model_json_schema()
    model = _get_chat_model(format_schema=schema_json, temperature=temperature)
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]

    last_error: Exception | None = None
    for _ in range(retries + 1):
        response = model.invoke(messages)
        raw = _content_to_str(response.content).strip()
        try:
            data = json.loads(raw)
            return schema.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = exc
            messages.append(AIMessage(content=raw))
            messages.append(
                HumanMessage(
                    content=(
                        "Your previous response did not validate against the required JSON "
                        f"schema. Error: {exc}. Respond again with ONLY a single valid JSON "
                        "object conforming exactly to the schema. No prose, no markdown."
                    )
                )
            )
    raise StructuredOutputError(f"schema={schema.__name__}: {last_error}")


def complete(system_prompt: str, user_prompt: str, temperature: float | None = None) -> str:
    """Free-text completion (used sparingly; most stages use structured output)."""
    from langchain_core.messages import HumanMessage, SystemMessage

    model = _get_chat_model(temperature=temperature)
    response = model.invoke(
        [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
    )
    return _content_to_str(response.content).strip()


def health_check() -> dict:
    """Verify the configured model is reachable on the Ollama host."""
    import ollama

    client = ollama.Client(host=settings.ollama_host)
    models = client.list().get("models", [])
    names = [m.get("model") or m.get("name") for m in models]
    return {
        "provider": settings.llm_provider,
        "host": settings.ollama_host,
        "model": settings.llm_model,
        "available": any(settings.llm_model in (n or "") for n in names),
        "models": names,
    }
