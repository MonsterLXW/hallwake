"""POST /api/flavor — LLM flavor behind the firewall (architecture.md §11).

ALWAYS 200 {available:bool, source:'llm'|'canned', text:str} for valid input;
invalid input -> 422 {ok:false,error} (never 5xx). The server builds the
prompt ONLY from request fields (kind, door, entity, deaths) plus its own
door->archetype table — the client sends no facts the server trusts.
LLM output is display-only: control chars + HTML tags stripped, whitespace
collapsed to one line, truncated to 240 chars. Any LLM failure
(timeout/offline/empty/garbage) -> canned pool. LLM text never reaches
game state (frontend renders via textContent only).
"""
import re
from typing import Any

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse

import canned
import llm

router = APIRouter()

KINDS = ("lore", "epitaph", "run")
ENTITIES = ("GAUNT", "MURMUR", "TALLY", "CINDER")

# Server-side mirror of architecture.md §4 — flavor prompt context only,
# derived from the door number the client already sent (never client-supplied).
ARCHETYPE_BY_DOOR = {
    1: "junction", 2: "guest", 3: "washroom", 4: "junction", 5: "junction",
    6: "laundry", 7: "guest", 8: "lounge", 9: "boiler", 10: "laundry",
    11: "guest", 12: "junction", 13: "guest", 14: "washroom", 15: "boiler",
    16: "laundry", 17: "lounge", 18: "junction", 19: "guest", 20: "washroom",
    21: "boiler", 22: "laundry", 23: "lounge", 24: "boiler",
}

SYSTEM_PROMPT_LORE = (
    "You write flavor text for HALLWAKE, a first-person horror game set in an "
    "endless hotel corridor of 24 doors. Write ONE eerie single sentence "
    "(max 200 characters) about the room the player has just entered. "
    "No quotes, no markdown, no preamble — output only the sentence."
)
SYSTEM_PROMPT_EPITAPH = (
    "You write epitaph lines for HALLWAKE, a first-person horror game. The "
    "player just died in the hotel. Write ONE dark-humor consolation "
    "sentence (max 200 characters), wry and brief, never cruel to the real "
    "player. No quotes, no markdown, no preamble — output only the sentence."
)
SYSTEM_PROMPT_RUN = (
    "You write run-card lines for HALLWAKE, a first-person horror game. The "
    "player just finished a run. Write ONE sentence (max 200 characters) "
    "that taunts or praises based on how deep they got and how often they "
    "died. No quotes, no markdown, no preamble — output only the sentence."
)
SYSTEM_PROMPTS = {"lore": SYSTEM_PROMPT_LORE, "epitaph": SYSTEM_PROMPT_EPITAPH, "run": SYSTEM_PROMPT_RUN}

_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_TAG_RE = re.compile(r"<[^>]*>")


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _validate(payload: dict[str, Any]) -> str | None:
    kind = payload.get("kind")
    if kind not in KINDS:
        return "kind must be one of lore|epitaph|run"
    door = payload.get("door")
    if not _is_int(door) or not 1 <= door <= 24:
        return "door must be an integer in 1..24"
    deaths = payload.get("deaths")
    if deaths is not None and (not _is_int(deaths) or not 0 <= deaths <= 99):
        return "deaths must be an integer in 0..99"
    entity = payload.get("entity")
    if entity is not None and not isinstance(entity, str):
        return "entity must be a string"
    return None


def _user_prompt(kind: str, door: int, entity: str | None, deaths: int | None) -> str:
    archetype = ARCHETYPE_BY_DOOR[door]
    if kind == "lore":
        parts = [f"Door {door}, a {archetype} room."]
        if entity:
            parts.append(f"The entity {entity} haunts this room.")
        return " ".join(parts)
    if kind == "epitaph":
        parts = [f"The player died at door {door}, a {archetype} room."]
        if entity:
            parts.append(f"They were caught by {entity}.")
        if deaths is not None:
            parts.append(f"Deaths so far: {deaths}.")
        return " ".join(parts)
    parts = [f"The player finished a run reaching door {door} of 24."]
    if deaths is not None:
        parts.append(f"They died {deaths} times.")
    return " ".join(parts)


def _sanitize(text: str) -> str:
    """Display-only hardening: strip control chars + HTML tags, collapse to
    one line, truncate 240. Sanitized-empty counts as garbage -> canned."""
    text = _CONTROL_RE.sub(" ", text)
    text = _TAG_RE.sub(" ", text)
    text = " ".join(text.split())
    return text[:240].strip()


@router.post("/api/flavor")
async def post_flavor(payload: dict[str, Any] = Body(...)):
    error = _validate(payload)
    if error is not None:
        return JSONResponse(status_code=422, content={"ok": False, "error": error})

    kind = str(payload["kind"])
    door = int(payload["door"])
    deaths = payload.get("deaths")
    entity = payload.get("entity")
    if entity not in ENTITIES:  # whitelist: unknown/absent -> no entity in prompt
        entity = None

    messages = [
        {"role": "system", "content": SYSTEM_PROMPTS[kind]},
        {"role": "user", "content": _user_prompt(kind, door, entity, deaths)},
    ]
    raw = await llm.chat(messages)
    text = _sanitize(raw) if raw else ""
    if text:
        return {"available": True, "source": "llm", "text": text}
    return {"available": False, "source": "canned", "text": canned.pick(kind, door)}
