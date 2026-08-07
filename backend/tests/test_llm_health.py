from pydantic import BaseModel

from llm import _copilot_chat, copilot_structured_complete, health_check, structured_complete


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

    def chat(messages, schema_json):
        captured["messages"] = messages
        captured["schema"] = schema_json
        return '{"answer":"clarified"}'

    monkeypatch.setattr("llm._copilot_chat", chat)
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

    monkeypatch.setattr(
        "llm._copilot_chat",
        lambda _messages, _schema: (
            '{"properties":{"answer":"Grounded answer","grounded":true}}'
        ),
    )

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
    assert captured["json"]["response_format"] == {"type": "json_object"}
    assert captured["json"]["chat_template_kwargs"] == {"enable_thinking": False}
