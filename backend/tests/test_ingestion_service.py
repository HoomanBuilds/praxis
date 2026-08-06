from ingestion import service


def test_redis_client_timeout_exceeds_worker_block(monkeypatch):
    import redis

    captured = {}
    sentinel = object()

    def fake_from_url(url, **kwargs):
        captured.update(kwargs)
        return sentinel

    monkeypatch.setattr(redis, "from_url", fake_from_url)
    service.get_redis.cache_clear()
    try:
        assert service.get_redis() is sentinel
        assert captured["socket_timeout"] > 5
        assert captured["socket_connect_timeout"] == 5
        assert captured["health_check_interval"] == 30
    finally:
        service.get_redis.cache_clear()


def test_queue_depth_counts_pending_and_unprocessed_messages(monkeypatch):
    class FakeRedis:
        def xinfo_groups(self, _stream):
            return [{"name": "praxis-workers", "pending": 2, "lag": 3}]

    monkeypatch.setattr(service, "get_redis", lambda: FakeRedis())

    assert service.queue_depth() == 5


def test_queue_depth_falls_back_to_stream_length_without_group(monkeypatch):
    class FakeRedis:
        def xinfo_groups(self, _stream):
            return []

        def xlen(self, _stream):
            return 4

    monkeypatch.setattr(service, "get_redis", lambda: FakeRedis())

    assert service.queue_depth() == 4
