"""Leaderboard endpoints per architecture.md section 10.

Validation mirrors frontend core/scoring.ts: name ^[A-Za-z0-9 .'-]{1,12}$,
deepest_door 1..24, run_time_ms 10000..1800000, deaths 0..99, seed int.
Invalid -> 422 {ok:false,error}; unknown extra fields ignored; never 5xx.
"""
import re
from typing import Any

from fastapi import APIRouter, Body, Query
from fastapi.responses import JSONResponse

import db

router = APIRouter()

NAME_RE = re.compile(r"^[A-Za-z0-9 .'-]{1,12}$")


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _validate(payload: dict[str, Any]) -> str | None:
    name = payload.get("name")
    if not isinstance(name, str) or not NAME_RE.match(name):
        return "name must match ^[A-Za-z0-9 .'-]{1,12}$"
    door = payload.get("deepest_door")
    if not _is_int(door) or not 1 <= door <= 24:
        return "deepest_door must be an integer in 1..24"
    run_ms = payload.get("run_time_ms")
    if not _is_int(run_ms) or not 10000 <= run_ms <= 1800000:
        return "run_time_ms must be an integer in 10000..1800000"
    deaths = payload.get("deaths")
    if not _is_int(deaths) or not 0 <= deaths <= 99:
        return "deaths must be an integer in 0..99"
    seed = payload.get("seed")
    if not _is_int(seed):
        return "seed must be an integer"
    return None


@router.get("/api/scores")
def get_scores(limit: int = Query(10)) -> dict:
    limit = max(1, min(50, limit))
    return {"scores": db.list_scores(limit)}


@router.post("/api/scores", status_code=201)
def post_scores(payload: dict[str, Any] = Body(...)):
    error = _validate(payload)
    if error is not None:
        return JSONResponse(status_code=422, content={"ok": False, "error": error})
    score_id, rank = db.insert_score(
        str(payload["name"]),
        int(payload["deepest_door"]),
        int(payload["run_time_ms"]),
        int(payload["deaths"]),
        int(payload["seed"]),
    )
    return {"ok": True, "id": score_id, "rank": rank}
