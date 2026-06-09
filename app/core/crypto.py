"""Symmetric encryption for secrets at rest (e.g. admin request reply credentials).

Uses Fernet (AES-128-CBC + HMAC-SHA256). The key lives in settings.ENCRYPTION_KEY
and must NEVER be committed to source control. Rotate by re-encrypting rows.
"""
from __future__ import annotations

from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.settings import settings

# A short, stable prefix lets us tell encrypted values apart from legacy
# plaintext rows so reads stay backward-compatible during/after the backfill.
_PREFIX = "enc::"

_fernet = Fernet(settings.ENCRYPTION_KEY.encode())


def encrypt_secret(plaintext: Optional[str]) -> Optional[str]:
    """Encrypt a secret for storage. Returns None for None/empty input."""
    if not plaintext:
        return plaintext
    token = _fernet.encrypt(plaintext.encode()).decode()
    return f"{_PREFIX}{token}"


def decrypt_secret(stored: Optional[str]) -> Optional[str]:
    """Decrypt a stored secret. Passes legacy plaintext through unchanged."""
    if not stored:
        return stored
    if not stored.startswith(_PREFIX):
        # Legacy plaintext written before encryption existed.
        return stored
    token = stored[len(_PREFIX):]
    try:
        return _fernet.decrypt(token.encode()).decode()
    except InvalidToken:
        return None
