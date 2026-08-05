"""Shared rate limiter (H5) — a separate module so route files can import ``limiter``
without importing ``api.main`` (which would create a circular import, since main.py
includes those routers).

In-memory storage is fine for local dev / a single-process deployment. The prod compose
file runs ``--workers 2``, and slowapi's in-memory store is per-process, so two workers
would each get their own independent counter and the real limit would silently double —
point it at the Redis instance already provisioned for the pipeline queue instead.
"""
from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings

_storage_uri = settings.redis_url if settings.environment == "production" else None

limiter = Limiter(key_func=get_remote_address, storage_uri=_storage_uri, default_limits=["120/minute"])
