import httpx
from pydantic import BaseModel

from llm import (
    CopilotTarget,
    _copilot_chat,
    _decode_json_object,
    copilot_configuration,
    copilot_structured_complete,
    health_check,
    structured_complete,
)


class ListingClient:
    def list(self):
        return {"models": [{"model": "llama3.1:8b"}]}


def test_shallow_health_does_not_generate(monkeypatch):
    def fail_if_called(*_args, **_kwargs):
        raise AssertionError("generation probe should not run")

    monkeypatch.setattr("llm._get_client", lambda: ListingClient())
    monkeypatch.setattr("llm._ollama.Client", fail_if_called)

    result = health_check(probe_generation=False)

    assert result["available"] is True
    assert result["generation_ok"] is None


def test_deep_health_generates_one_token(monkeypatch):
    calls = []

    class ProbeClient:
        def chat(self, **kwargs):
            calls.append(kwargs)

    monkeypatch.setattr("llm._get_client", lambda: ListingClient())
    monkeypatch.setattr("llm._ollama.Client", lambda **_kwargs: ProbeClient())

    result = health_check(probe_generation=True)

    assert result["generation_ok"] is True
    assert calls[0]["options"] == {"num_predict": 1}


def test_structured_completion_applies_request_limits(monkeypatch):
    calls = []
    timeouts = []

    class Answer(BaseModel):
        answer: str

    class ChatClient:
        def chat(self, **kwargs):
            calls.append(kwargs)
            return {"message": {"content": '{"answer":"ok"}'}}

    monkeypatch.setattr(
        "llm._get_client",
        lambda timeout=None: timeouts.append(timeout) or ChatClient(),
    )

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
    assert timeouts == [12]
    assert calls[0]["options"]["num_ctx"] == 2048
    assert calls[0]["options"]["num_predict"] == 128


def test_copilot_completion_preserves_conversation_history(monkeypatch):
    captured = {}

    class Answer(BaseModel):
        answer: str

    def chat(_target, messages, schema_json, _timeout):
        captured["messages"] = messages
        captured["schema"] = schema_json
        return '{"answer":"clarified"}'

    monkeypatch.setattr("llm._copilot_targets", lambda: [CopilotTarget("ollama", "local")])
    monkeypatch.setattr("llm._copilot_chat_target", chat)
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

    monkeypatch.setattr("llm._copilot_targets", lambda: [CopilotTarget("ollama", "local")])
    monkeypatch.setattr("llm._copilot_chat_target", lambda *_args: (
        '{"properties":{"answer":"Grounded answer","grounded":true}}'
    ))

    result = copilot_structured_complete(
        "system",
        [],
        "question",
        Answer,
        retries=0,
    )

    assert result.parsed.answer == "Grounded answer"
    assert result.parsed.grounded is True


def test_ollama_copilot_uses_json_mode(monkeypatch):
    calls = []

    class ChatClient:
        def chat(self, **kwargs):
            calls.append(kwargs)
            return {"message": {"content": '{"answer":"ok"}'}}

    monkeypatch.setattr("llm.settings.copilot_provider", "ollama")
    monkeypatch.setattr("llm.settings.copilot_model", "llama3.2:3b")
    monkeypatch.setattr("llm._ollama.Client", lambda **_kwargs: ChatClient())

    raw = _copilot_chat(
        [{"role": "user", "content": "Hello"}],
        {"type": "object"},
    )

    assert raw == '{"answer":"ok"}'
    assert calls[0]["model"] == "llama3.2:3b"
    assert calls[0]["format"] == "json"


def test_0g_copilot_uses_openai_compatible_json_mode(monkeypatch):
    captured = {}

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": '{"answer":"ok"}'}}]}

    def post(url, **kwargs):
        captured["url"] = url
        captured.update(kwargs)
        return Response()

    monkeypatch.setattr("llm.settings.copilot_provider", "0g")
    monkeypatch.setattr("llm.settings.copilot_model", "0gm-1.0-35b-a3b")
    monkeypatch.setattr("llm.settings.copilot_api_key", "test-key")
    monkeypatch.setattr("llm.httpx.post", post)

    raw = _copilot_chat(
        [{"role": "user", "content": "Hello"}],
        {"type": "object"},
    )

    assert raw == '{"answer":"ok"}'
    assert captured["url"] == "https://router-api.0g.ai/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer test-key"
    assert captured["headers"]["X-0G-Provider-Sort"] == "latency"
    assert captured["json"]["response_format"] == {"type": "json_object"}
    assert captured["json"]["chat_template_kwargs"] == {"enable_thinking": False}


def test_copilot_configuration_preserves_fallback_order(monkeypatch):
    monkeypatch.setattr("llm.settings.copilot_provider", "0g")
    monkeypatch.setattr("llm.settings.copilot_model", "qwen3.8-max")
    monkeypatch.setattr(
        "llm.settings.copilot_fallback_models",
        "glm-5.1,deepseek-v4-flash,qwen3.7-plus,minimax-m3",
    )
    monkeypatch.setattr("llm.settings.copilot_local_model", "llama3.2:3b")
    monkeypatch.setattr("llm.settings.copilot_api_key", "test-key")

    result = copilot_configuration()

    assert result == {
        "provider": "0g",
        "primary_model": "qwen3.8-max",
        "fallback_models": [
            "glm-5.1",
            "deepseek-v4-flash",
            "qwen3.7-plus",
            "minimax-m3",
        ],
        "local_fallback_model": "llama3.2:3b",
        "api_key_configured": True,
    }


def test_structured_copilot_uses_next_model_after_invalid_output(monkeypatch):
    calls = []

    class Answer(BaseModel):
        answer: str

    targets = [
        CopilotTarget("0g", "qwen3.8-max"),
        CopilotTarget("0g", "glm-5.1"),
        CopilotTarget("ollama", "llama3.2:3b"),
    ]

    def chat(target, *_args):
        calls.append(target.model)
        if target.model == "qwen3.8-max":
            return "not json"
        return '{"answer":"fallback worked"}'

    monkeypatch.setattr("llm._copilot_targets", lambda: targets)
    monkeypatch.setattr("llm._copilot_chat_target", chat)

    result = copilot_structured_complete("system", [], "question", Answer, retries=0)

    assert calls == ["qwen3.8-max", "glm-5.1"]
    assert result.parsed.answer == "fallback worked"
    assert result.provider == "0g"
    assert result.model == "glm-5.1"


def test_auth_failure_skips_cloud_models_and_uses_local(monkeypatch):
    calls = []

    class Answer(BaseModel):
        answer: str

    targets = [
        CopilotTarget("0g", "qwen3.8-max"),
        CopilotTarget("0g", "glm-5.1"),
        CopilotTarget("ollama", "llama3.2:3b"),
    ]

    def chat(target, *_args):
        calls.append(target.model)
        if target.provider == "0g":
            request = httpx.Request("POST", "https://router-api.0g.ai/v1/chat/completions")
            response = httpx.Response(402, request=request)
            raise httpx.HTTPStatusError("payment required", request=request, response=response)
        return '{"answer":"local fallback"}'

    monkeypatch.setattr("llm._copilot_targets", lambda: targets)
    monkeypatch.setattr("llm._copilot_chat_target", chat)

    result = copilot_structured_complete("system", [], "question", Answer, retries=0)

    assert calls == ["qwen3.8-max", "llama3.2:3b"]
    assert result.provider == "ollama"
    assert result.model == "llama3.2:3b"


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

    monkeypatch.setattr("llm.settings.copilot_provider", "0g")
    monkeypatch.setattr("llm.settings.copilot_model", "minimax-m3")
    monkeypatch.setattr("llm.settings.copilot_fallback_models", "")
    monkeypatch.setattr("llm.settings.copilot_local_model", "")
    monkeypatch.setattr("llm.settings.copilot_api_key", "test-key")
    monkeypatch.setattr("llm.httpx.post", post)

    raw = _copilot_chat([{"role": "user", "content": "Hello"}], {"type": "object"})

    assert "response_format" in payloads[0]
    assert "response_format" not in payloads[1]
    assert _decode_json_object(raw) == {"answer": "ok"}
