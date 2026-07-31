"""Encryption at rest for integration credentials.

Secrets are stored as a single Fernet-encrypted blob in the ``config`` JSON column.
The key comes from ``PRAXIS_INTEGRATION_ENCRYPTION_KEY`` or, for local development,
from a persisted key file under ``data/integration.key`` (created on first use).

Because the whole config is opaque ciphertext, the "never leak a secret" property is
structural: no API read endpoint can ever return config, and a raw DB dump yields no
usable credentials.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
from functools import lru_cache
from pathlib import Path

from config import settings

_KEY_PATH = Path(settings.integration_key_path)


def _load_or_create_key() -> bytes:
    env = os.environ.get("PRAXIS_INTEGRATION_ENCRYPTION_KEY") or settings.integration_encryption_key
    if env:
        from cryptography.fernet import Fernet

        try:
            Fernet(env.encode())  # valid Fernet key -> use as-is
            return env.encode()
        except Exception:
            # Any passphrase -> derive a Fernet key deterministically.
            digest = hashlib.sha256(env.encode()).digest()
            return base64.urlsafe_b64encode(digest)
    if _KEY_PATH.exists():
        return _KEY_PATH.read_bytes().strip()
    from cryptography.fernet import Fernet

    key = Fernet.generate_key()
    _KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
    _KEY_PATH.write_bytes(key)
    _KEY_PATH.chmod(0o600)
    return key


@lru_cache(maxsize=1)
def get_fernet():
    from cryptography.fernet import Fernet

    return Fernet(_load_or_create_key())


def encrypt_config(config: dict | None) -> str | None:
    """Encrypt a whole config dict into an opaque string blob (None-safe)."""
    if config is None:
        return None
    return get_fernet().encrypt(json.dumps(config).encode()).decode()


def decrypt_config(blob: str | None) -> dict:
    """Decrypt a config blob back to a dict (None-safe -> {})."""
    if not blob:
        return {}
    try:
        raw = get_fernet().decrypt(blob.encode())
    except Exception:
        return {}
    try:
        return json.loads(raw.decode())
    except Exception:
        return {}
