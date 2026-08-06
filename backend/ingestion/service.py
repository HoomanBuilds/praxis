"""Regulatory Ingestion Service — message-bus side (proposal §5.2.1, §11.2).

Publishes ``document.process`` events to a Redis Stream so the agent pipeline is decoupled
from the user-facing API and can be scaled independently. Redis Streams (with a consumer
group) give durability and at-least-once delivery — events survive a worker restart.
"""
from __future__ import annotations

from functools import lru_cache

from config import settings


@lru_cache(maxsize=1)
def get_redis():
    import redis

    return redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=10,
        health_check_interval=30,
    )


def ensure_group() -> None:
    """Create the consumer group (idempotent)."""
    client = get_redis()
    try:
        client.xgroup_create(settings.redis_stream, settings.redis_group, id="0", mkstream=True)
    except Exception as exc:  # BUSYGROUP if it already exists
        if "BUSYGROUP" not in str(exc):
            raise


def publish_process_event(document_id: str) -> str:
    """Enqueue a document for Phase-A processing. Returns the stream message id."""
    client = get_redis()
    return client.xadd(settings.redis_stream, {"document_id": document_id, "event": "document.process"})


def queue_depth() -> int:
    client = get_redis()
    try:
        groups = client.xinfo_groups(settings.redis_stream)
        for group in groups:
            if group.get("name") == settings.redis_group:
                return int(group.get("pending", 0)) + int(group.get("lag") or 0)
        return client.xlen(settings.redis_stream)
    except Exception:
        return 0
