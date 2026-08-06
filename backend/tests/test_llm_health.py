from llm import health_check


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
