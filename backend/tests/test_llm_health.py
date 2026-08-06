from pydantic import BaseModel

from llm import health_check, structured_complete


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
