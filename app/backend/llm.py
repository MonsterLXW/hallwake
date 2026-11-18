"""Local-only LLM client for the project's own runtime.

The ONE inference backend: local vLLM, OpenAI-compatible. Never add paid APIs.
"""
import os

import requests

URL = os.environ.get("HF_LLM_URL", "http://100.124.134.63:8890/v1").rstrip("/")
MODEL = os.environ.get("HF_LLM_MODEL", "qwen3.8-flash-next")


def chat(messages, temperature=0.3, max_tokens=1200, json_mode=False, timeout=60, retries=2):
    body = {"model": MODEL, "messages": messages, "temperature": temperature,
            "max_tokens": max_tokens}
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    last = None
    for _ in range(retries + 1):
        try:
            r = requests.post(f"{URL}/chat/completions", json=body, timeout=timeout)
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:  # network/model hiccup -> retry then raise
            last = e
    raise RuntimeError(f"LLM unavailable at {URL}: {last}")
