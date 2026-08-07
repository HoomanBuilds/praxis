import httpx
from pydantic import BaseModel

from llm import (
    InferenceOptions,
    InferenceTarget,
    _copilot_chat,
    _decode_json_object,
    ai_configuration,
    complete,
    copilot_structured_complete,
    health_check,
    structured_complete,
)


class ListingClient:
    def list(self):
        return {"models": [{"model": "llama3.1:8b"}]}


def _options() -> InferenceOptions:
    return InferenceOptions(
        temperature=0.0,
        num_ctx=2048,
        num_predict=128,
        request_timeout=12,
        cloud_timeout=30,
        local_timeout=20,
    )


def test_shallow_health_does_not_generate(monkeypatch):
    def fail_if_called(*_args, **_kwargs):
        raise AssertionError("generation probe should not run")

    monkeypatch.setattr("llm.settings.llm_provider", "ollama")
    monkeypatch.setattr("llm.settings.llm_model", "llama3.1:8b")
    monkeypatch.setattr("llm._get_client", lambda: ListingClient())
    monkeypatch.setattr("llm._ollama.Client", fail_if_called)

    result = health_check(probe_generation=False)

    assert result["available"] is True
    assert result["local_available"] is True
    assert result["generation_ok"] is None


def test_deep_health_uses_the_shared_primary_target(monkeypatch):
    calls = []

    class ProbeClient:
        def chat(self, **kwargs):
            calls.append(kwargs)
            return {"message": {"content": "ok"}}

    monkeypatch.setattr("llm.settings.llm_provider", "ollama")
    monkeypatch.setattr("llm.settings.llm_model", "llama3.1:8b")
    monkeypatch.setattr("llm._get_client", lambda: ListingClient())
    monkeypatch.setattr("llm._ollama.Client", lambda **_kwargs: ProbeClient())

    result = health_check(probe_generation=True)

    assert result["generation_ok"] is True
    assert result["generation_provider"] == "ollama"
    assert result["generation_model"] == "llama3.1:8b"
    assert calls[0]["options"]["num_predict"] == 1


def test_pipeline_structured_completion_applies_request_limits(monkeypatch):
    captured = {}

    class Answer(BaseModel):
        answer: str

    def chat(target, messages, schema_json, timeout, options):
        captured.update({
            "target": target,
            "messages": messages,
            "schema": schema_json,
            "timeout": timeout,
            "options": options,
        })
        return '{"answer":"ok"}'

    monkeypatch.setattr("llm._ai_targets", lambda: [InferenceTarget("ollama", "local")])
    monkeypatch.setattr("llm._chat_target", chat)

    result = structured_complete(
        "system",
        "question",
        Answer,
        retries=0,
        num_ctx=2048,
        num_predict=128,
        timeout=12,
    )

    assert result.parsed.answer == "ok"
    assert result.provider == "ollama"
    assert captured["timeout"] == 12
    assert captured["options"].num_ctx == 2048
    assert captured["options"].num_predict == 128


def test_copilot_completion_preserves_conversation_history(monkeypatch):
    captured = {}

    class Answer(BaseModel):
        answer: str

    def chat(_target, messages, schema_json, _timeout, _options):
        captured["messages"] = messages
        captured["schema"] = schema_json
        return '{"answer":"clarified"}'

    monkeypatch.setattr("llm._ai_targets", lambda: [InferenceTarget("ollama", "local")])
    monkeypatch.setattr("llm._chat_target", chat)
    result = copilot_structured_complete(
        "system",
        [
            {"role": "user", "content": "Explain the review queue"},
            {"role": "assistant", "content": "It contains pending obligations."},
        ],
        "What do you mean?",
        Answer,
        retries=0,
    )

    assert result.parsed.answer == "clarified"
    assert captured["messages"][1:3] == [
        {"role": "user", "content": "Explain the review queue"},
        {"role": "assistant", "content": "It contains pending obligations."},
    ]
    assert captured["schema"]["title"] == "Answer"


def test_copilot_completion_unwraps_properties_object(monkeypatch):
    class Answer(BaseModel):
        answer: str
        grounded: bool

    monkeypatch.setattr("llm._ai_targets", lambda: [InferenceTarget("ollama", "local")])
    monkeypatch.setattr(
        "llm._chat_target",
        lambda *_args: '{"properties":{"answer":"Grounded answer","grounded":true}}',
    )

    result = copilot_structured_complete("system", [], "question", Answer, retries=0)

    assert result.parsed.answer == "Grounded answer"
    assert result.parsed.grounded is True


def test_ollama_uses_the_requested_json_schema(monkeypatch):
    calls = []

    class ChatClient:
        def chat(self, **kwargs):
            calls.append(kwargs)
            return {"message": {"content": '{"answer":"ok"}'}}

    monkeypatch.setattr("llm.settings.llm_provider", "ollama")
    monkeypatch.setattr("llm.settings.llm_model", "llama3.1:8b")
    monkeypatch.setattr("llm._ollama.Client", lambda **_kwargs: ChatClient())

    raw = _copilot_chat(
        [{"role": "user", "content": "Hello"}],
        {"type": "object", "properties": {"answer": {"type": "string"}}},
    )

    assert raw == '{"answer":"ok"}'
    assert calls[0]["model"] == "llama3.1:8b"
    assert calls[0]["format"]["properties"]["answer"]["type"] == "string"


def test_0g_uses_json_mode_and_latency_routing(monkeypatch):
    captured = {}

    class Response:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": '{"answer":"ok"}'}}]}

    def post(url, **kwargs):
        captured["url"] = url
        captured.update(kwargs)
        return Response()

    monkeypatch.setattr("llm.settings.llm_provider", "0g")
    monkeypatch.setattr("llm.settings.llm_model", "qwen3.8-max")
    monkeypatch.setattr("llm.settings.llm_fallback_models", "glm-5.1,minimax-m3")
    monkeypatch.setattr("llm.settings.llm_local_model", "llama3.1:8b")
    monkeypatch.setattr("llm.settings.llm_api_key", "test-key")
    monkeypatch.setattr("llm.httpx.post", post)

    raw = _copilot_chat([{"role": "user", "content": "Hello"}], {"type": "object"})

    assert raw == '{"answer":"ok"}'
    assert captured["url"] == "https://router-api.0g.ai/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer test-key"
    assert captured["headers"]["X-0G-Provider-Sort"] == "latency"
    assert captured["json"]["response_format"] == {"type": "json_object"}
    assert captured["json"]["chat_template_kwargs"] == {"enable_thinking": False}


def test_ai_configuration_has_exactly_three_cloud_models_then_local(monkeypatch):
    monkeypatch.setattr("llm.settings.llm_provider", "0g")
    monkeypatch.setattr("llm.settings.llm_model", "qwen3.8-max")
    monkeypatch.setattr("llm.settings.llm_fallback_models", "glm-5.1,minimax-m3")
    monkeypatch.setattr("llm.settings.llm_local_model", "llama3.1:8b")
    monkeypatch.setattr("llm.settings.llm_api_key", "test-key")

    result = ai_configuration()

    assert result == {
        "provider": "0g",
        "primary_model": "qwen3.8-max",
        "fallback_models": ["glm-5.1", "minimax-m3"],
        "cloud_model_count": 3,
        "local_fallback_model": "llama3.1:8b",
        "api_key_configured": True,
    }


def test_pipeline_uses_next_model_after_invalid_output(monkeypatch):
    calls = []

    class Answer(BaseModel):
        answer: str

    targets = [
        InferenceTarget("0g", "qwen3.8-max"),
        InferenceTarget("0g", "glm-5.1"),
        InferenceTarget("0g", "minimax-m3"),
        InferenceTarget("ollama", "llama3.1:8b"),
    ]

    def chat(target, *_args):
        calls.append(target.model)
        if target.model == "qwen3.8-max":
            return "not json"
        return '{"answer":"fallback worked"}'

    monkeypatch.setattr("llm._ai_targets", lambda: targets)
    monkeypatch.setattr("llm._chat_target", chat)

    result = structured_complete("system", "question", Answer, retries=0)

    assert calls == ["qwen3.8-max", "glm-5.1"]
    assert result.parsed.answer == "fallback worked"
    assert result.provider == "0g"
    assert result.model == "glm-5.1"


def test_account_failure_skips_cloud_models_and_uses_local(monkeypatch):
    calls = []

    class Answer(BaseModel):
        answer: str

    targets = [
        InferenceTarget("0g", "qwen3.8-max"),
        InferenceTarget("0g", "glm-5.1"),
        InferenceTarget("0g", "minimax-m3"),
        InferenceTarget("ollama", "llama3.1:8b"),
    ]

    def chat(target, *_args):
        calls.append(target.model)
        if target.provider == "0g":
            request = httpx.Request("POST", "https://router-api.0g.ai/v1/chat/completions")
            response = httpx.Response(402, request=request)
            raise httpx.HTTPStatusError("payment required", request=request, response=response)
        return '{"answer":"local fallback"}'

    monkeypatch.setattr("llm._ai_targets", lambda: targets)
    monkeypatch.setattr("llm._chat_target", chat)

    result = structured_complete("system", "question", Answer, retries=0)

    assert calls == ["qwen3.8-max", "llama3.1:8b"]
    assert result.provider == "ollama"
    assert result.model == "llama3.1:8b"


def test_free_text_completion_uses_the_same_ordered_chain(monkeypatch):
    calls = []
    targets = [
        InferenceTarget("0g", "qwen3.8-max"),
        InferenceTarget("0g", "glm-5.1"),
        InferenceTarget("ollama", "llama3.1:8b"),
    ]

    def chat(target, *_args):
        calls.append(target.model)
        if target.model == "qwen3.8-max":
            request = httpx.Request("POST", "https://router-api.0g.ai/v1/chat/completions")
            response = httpx.Response(503, request=request)
            raise httpx.HTTPStatusError("unavailable", request=request, response=response)
        return "fallback text"

    monkeypatch.setattr("llm._ai_targets", lambda: targets)
    monkeypatch.setattr("llm._chat_target", chat)

    result = complete("system", "question")

    assert result == "fallback text"
    assert calls == ["qwen3.8-max", "glm-5.1"]


def test_model_without_json_mode_retries_with_prompt_only(monkeypatch):
    payloads = []
    request = httpx.Request("POST", "https://router-api.0g.ai/v1/chat/completions")
    responses = [
        httpx.Response(
            400,
            request=request,
            json={"error": {"code": "model_not_capable"}},
        ),
        httpx.Response(
            200,
            request=request,
            json={"choices": [{"message": {"content": '<think>reasoning</think>{"answer":"ok"}'}}]},
        ),
    ]

    def post(_url, **kwargs):
        payloads.append(kwargs["json"].copy())
        return responses.pop(0)

    monkeypatch.setattr("llm.settings.llm_provider", "0g")
    monkeypatch.setattr("llm.settings.llm_model", "minimax-m3")
    monkeypatch.setattr("llm.settings.llm_fallback_models", "")
    monkeypatch.setattr("llm.settings.llm_local_model", "")
    monkeypatch.setattr("llm.settings.llm_api_key", "test-key")
    monkeypatch.setattr("llm.httpx.post", post)

    raw = _copilot_chat([{"role": "user", "content": "Hello"}], {"type": "object"})

    assert "response_format" in payloads[0]
    assert "response_format" not in payloads[1]
    assert _decode_json_object(raw) == {"answer": "ok"}
