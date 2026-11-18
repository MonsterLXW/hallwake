"""T5 — leaderboard API tests per architecture.md sections 9 + 10.

Temp DB per test via HALLWAKE_DB env + explicit db.init_db() (TestClient
without a context manager does not run the app lifespan).
"""
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

import db
from main import app

VALID = {
    "name": "Ada L.",
    "deepest_door": 5,
    "run_time_ms": 60000,
    "deaths": 2,
    "seed": 1234,
}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("HALLWAKE_DB", str(tmp_path / "hallwake-test.db"))
    db.init_db()
    return TestClient(app)


def post_score(client, **overrides):
    body = dict(VALID)
    body.update(overrides)
    return client.post("/api/scores", json=body)


def test_insert_and_list_roundtrip(client):
    r = post_score(client)
    assert r.status_code == 201
    body = r.json()
    assert body["ok"] is True
    assert isinstance(body["id"], int)
    assert body["rank"] == 1

    g = client.get("/api/scores")
    assert g.status_code == 200
    scores = g.json()["scores"]
    assert len(scores) == 1
    row = scores[0]
    assert set(row) == {"id", "name", "deepest_door", "run_time_ms", "deaths", "created_at"}
    assert row["id"] == body["id"]
    assert row["name"] == "Ada L."
    assert row["deepest_door"] == 5
    assert row["run_time_ms"] == 60000
    assert row["deaths"] == 2


def test_empty_leaderboard(client):
    g = client.get("/api/scores")
    assert g.status_code == 200
    assert g.json() == {"scores": []}


def test_rank_correctness(client):
    # A: shallow door ranks below deeper doors
    a = post_score(client, deepest_door=5, run_time_ms=60000, deaths=2).json()
    # B: deeper door -> rank 1 even though slower than A
    b = post_score(client, deepest_door=10, run_time_ms=120000, deaths=0).json()
    # C: same door as B, faster time -> rank 1
    c = post_score(client, deepest_door=10, run_time_ms=90000, deaths=0).json()
    # D: same door+time as C, more deaths -> ranks below C
    d = post_score(client, deepest_door=10, run_time_ms=90000, deaths=1).json()
    assert [a["rank"], b["rank"], c["rank"], d["rank"]] == [1, 1, 1, 2]

    rows = client.get("/api/scores").json()["scores"]
    assert [row["id"] for row in rows] == [c["id"], d["id"], b["id"], a["id"]]


def test_tie_gets_same_rank(client):
    first = post_score(client, deepest_door=10, run_time_ms=60000, deaths=0).json()
    second = post_score(client, deepest_door=10, run_time_ms=60000, deaths=0, seed=99).json()
    assert first["rank"] == 1
    assert second["rank"] == 1


@pytest.mark.parametrize("field,value", [
    ("name", "abcdefghijklm"),  # 13 chars
    ("name", ""),
    ("name", "bad$name"),
    ("name", "new\nline"),
    ("name", 42),
    ("deepest_door", 25),
    ("deepest_door", 0),
    ("deepest_door", "5"),
    ("deepest_door", True),
    ("run_time_ms", 9999),
    ("run_time_ms", 1800001),
    ("run_time_ms", -1),
    ("deaths", 100),
    ("deaths", -1),
    ("seed", "abc"),
    ("seed", 1.5),
])
def test_invalid_field_422(client, field, value):
    r = post_score(client, **{field: value})
    assert r.status_code == 422
    body = r.json()
    assert body["ok"] is False
    assert isinstance(body["error"], str) and body["error"]


@pytest.mark.parametrize("field", ["name", "deepest_door", "run_time_ms", "deaths", "seed"])
def test_missing_field_422(client, field):
    body = dict(VALID)
    del body[field]
    r = client.post("/api/scores", json=body)
    assert r.status_code == 422
    assert r.json() == {"ok": False, "error": r.json()["error"]}
    assert r.json()["ok"] is False


def test_boundary_values_accepted(client):
    assert post_score(client, name="A b.c-D'e 1", deepest_door=1,
                      run_time_ms=10000, deaths=0).status_code == 201
    assert post_score(client, name="Z9", deepest_door=24,
                      run_time_ms=1800000, deaths=99).status_code == 201


def test_extra_fields_ignored(client):
    r = client.post("/api/scores", json=dict(VALID, cheat=True, nested={"x": 1}))
    assert r.status_code == 201
    assert r.json()["ok"] is True


def test_malformed_json_never_5xx(client):
    r = client.post("/api/scores", content="not json",
                    headers={"Content-Type": "application/json"})
    assert r.status_code == 422
    assert r.json()["ok"] is False


def test_limit_clamp(client):
    for i in range(3):
        post_score(client, seed=100 + i)
    assert len(client.get("/api/scores?limit=0").json()["scores"]) == 1
    assert len(client.get("/api/scores?limit=-5").json()["scores"]) == 1
    assert len(client.get("/api/scores?limit=999").json()["scores"]) == 3
    assert len(client.get("/api/scores?limit=2").json()["scores"]) == 2
    assert len(client.get("/api/scores").json()["scores"]) == 3


def test_limit_non_int_422(client):
    r = client.get("/api/scores?limit=abc")
    assert r.status_code == 422
    assert r.json()["ok"] is False


def test_created_at_iso_utc(client):
    post_score(client)
    row = client.get("/api/scores").json()["scores"][0]
    parsed = datetime.fromisoformat(row["created_at"])
    assert parsed.tzinfo is not None


def test_health_shape(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert isinstance(body["llm"]["online"], bool)
    assert isinstance(body["llm"]["model"], str) and body["llm"]["model"]
