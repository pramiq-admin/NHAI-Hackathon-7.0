"""Aadhar number hashing + Verhoeff checksum validation.

NEVER stores plain Aadhar numbers. Server keeps only `HMAC-SHA256(pepper,
salt || aadhar)` plus the per-record salt. Pepper is a server-side-only
secret (env var `AADHAR_PEPPER`); without it, a DB leak alone is useless
for brute-force.

A leftover SHA-256-only verifier is kept for backward compatibility with
records that were written before the HMAC upgrade — those records will
upgrade in place on next successful verify (call site can choose to
re-hash with the new scheme).
"""
import hashlib
import hmac
import os
import re


# Verhoeff algorithm tables
_VERHOEFF_D = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
    (2, 3, 4, 0, 1, 7, 8, 9, 5, 6),
    (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
    (4, 0, 1, 2, 3, 9, 5, 6, 7, 8),
    (5, 9, 8, 7, 6, 0, 4, 3, 2, 1),
    (6, 5, 9, 8, 7, 1, 0, 4, 3, 2),
    (7, 6, 5, 9, 8, 2, 1, 0, 4, 3),
    (8, 7, 6, 5, 9, 3, 2, 1, 0, 4),
    (9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
)
_VERHOEFF_P = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
    (5, 8, 0, 3, 7, 9, 6, 1, 4, 2),
    (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
    (9, 4, 5, 3, 1, 2, 6, 8, 7, 0),
    (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
    (2, 7, 9, 3, 8, 0, 6, 4, 1, 5),
    (7, 0, 4, 6, 9, 1, 3, 2, 5, 8),
)


# ---------- Verhoeff / formatting helpers ----------

def validate_aadhar_format(aadhar: str) -> bool:
    """Returns True if 12 digits AND Verhoeff checksum is valid."""
    if not isinstance(aadhar, str):
        return False
    digits = re.sub(r"\D", "", aadhar)
    if len(digits) != 12:
        return False
    if digits[0] in ("0", "1"):
        return False
    c = 0
    for i, d in enumerate(reversed(digits)):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][int(d)]]
    return c == 0


def normalize_aadhar(aadhar: str) -> str:
    """Strip spaces/dashes, return 12 digits or empty string."""
    return re.sub(r"\D", "", aadhar or "")


def mask_aadhar(aadhar: str) -> str:
    """Return XXXX-XXXX-1234 style mask for display."""
    n = normalize_aadhar(aadhar)
    if len(n) != 12:
        return "XXXX-XXXX-XXXX"
    return f"XXXX-XXXX-{n[-4:]}"


# ---------- Hashing ----------

# Format prefix for HMAC scheme. Anything without a known prefix is treated as
# legacy salted-SHA256 for backwards verify.
_HMAC_PREFIX = "v2$"


def _get_pepper() -> bytes:
    """Fetch the Aadhar pepper from env. May be empty in dev — callers should
    not gate hashing on this (we still hash without pepper, but the resulting
    hash is no stronger than its salt against an attacker who got the DB).
    Production config validation refuses to boot if this is empty."""
    return os.environ.get("AADHAR_PEPPER", "").encode("utf-8")


def hash_aadhar(aadhar: str, salt: str | None = None) -> tuple[str, str]:
    """Hash an Aadhar with HMAC-SHA256(pepper, salt || normalized_aadhar).

    Returns (hash_with_prefix, salt_hex). If `salt` is supplied (e.g. by a
    verify call against a stored record), uses it as-is.
    """
    normalized = normalize_aadhar(aadhar)
    if salt is None:
        salt = os.urandom(16).hex()
    msg = bytes.fromhex(salt) + normalized.encode("utf-8")
    mac = hmac.new(_get_pepper(), msg=msg, digestmod=hashlib.sha256)
    return _HMAC_PREFIX + mac.hexdigest(), salt


def _hash_legacy_sha256(aadhar: str, salt: str) -> str:
    """The pre-v2 hash: SHA-256(salt_bytes || aadhar). No pepper."""
    h = hashlib.sha256()
    h.update(bytes.fromhex(salt))
    h.update(normalize_aadhar(aadhar).encode("utf-8"))
    return h.hexdigest()


def verify_aadhar(aadhar: str, stored_hash: str, salt: str) -> bool:
    """Compare a candidate Aadhar against a stored hash + salt.

    Auto-detects scheme: anything starting with `v2$` is HMAC, otherwise legacy
    salted SHA-256. Use `hmac.compare_digest` for constant-time compare to
    avoid timing leaks.
    """
    if stored_hash.startswith(_HMAC_PREFIX):
        candidate, _ = hash_aadhar(aadhar, salt)
        return hmac.compare_digest(candidate, stored_hash)
    candidate = _hash_legacy_sha256(aadhar, salt)
    return hmac.compare_digest(candidate, stored_hash)


def needs_rehash(stored_hash: str) -> bool:
    """Returns True if a successful verify should be followed by a re-hash to
    the current scheme. Lets call sites lazily upgrade legacy records."""
    return not stored_hash.startswith(_HMAC_PREFIX)
