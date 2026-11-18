"""Local-only LLM client — the flavor firewall's single inference path.

The ONE inference backend: local vLLM, OpenAI-compatible, no key.
Never add paid cloud APIs. Hard 0.8 s timeout, NO retries, one request at
a time (asyncio.Semaphore(1)); while the slot is busy new calls return
None immediately (never queued); ANY failure returns None so callers fall
back to canned text — the game is 100% playable with the LLM down.

Live-probe note (2026-11-18, real endpoint): qwen3.8-flash-next is a
reasoning model. With thinking enabled its reasoning tokens blow past
max_tokens=80 (content=None at 1.45 s; 9.2 s at max_tokens=400) — far
outside the 0.8 s firewall. vLLM's chat_template_kwargs enable_thinking
=false returns one-line flavor in ~0.6 s at max_tokens=80, so flavor
calls disable thinking. Same local model, same OpenAI-compatible schema.
"""
import asyncio
import os
import time

import httpx

URL = os.environ.get("HF_LLM_URL", "http://100.124.134.63:8890/v1").rstrip("/")
MODEL = os.environ.get("HF_LLM_MODEL", "qwen3.8-flash-next")

TIMEOUT_S = 0.8
PROBE_CACHE_SECONDS = 30.0

_SEMAPHORE = asyncio.Semaphore(1)
_probe_cache: tuple[float, bool] = (0.0, False)


async def chat(messages, max_tokens=80, temperature=0.8, timeout=TIMEOUT_S):
    """One-shot chat completion. Returns the content string, or None on ANY
    failure (timeout, offline, HTTP error, empty/non-string payload). No retries."""
    body = {
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    try:
        if _SEMAPHORE.locked():
            # Firewall busy: degrade to canned IMMEDIATELY. Never queue
            # waiters on the semaphore — a flood of flavor POSTs must not
            # pile up unbounded pending requests behind the 0.8 s slot.
            return None
        async with _SEMAPHORE:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(f"{URL}/chat/completions", json=body)
                resp.raise_for_status()
                content = resp.json()["choices"][0]["message"]["content"]
    except Exception:
        return None
    return content if isinstance(content, str) else None


def probe() -> bool:
    """GET /models liveness check, cached for 30 s. Never raises, never 5xx."""
    global _probe_cache
    now = time.monotonic()
    cached_at, online = _probe_cache
    if now - cached_at < PROBE_CACHE_SECONDS:
        return online
    try:
        online = httpx.get(f"{URL}/models", timeout=1.0).status_code == 200
    except Exception:
        online = False
    _probe_cache = (now, online)
    return online
