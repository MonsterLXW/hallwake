"""SQLite persistence for the HALLWAKE leaderboard (stdlib only, no ORM).

Schema is architecture.md section 9 DDL, executed verbatim by init_db().
Rank order: deepest_door DESC, run_time_ms ASC, deaths ASC (idx_scores_rank).
"""
import os
import sqlite3
from datetime import datetime, timezone

DDL = """
CREATE TABLE IF NOT EXISTS scores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,               -- 1..12 chars, [A-Za-z0-9 .'-]
  deepest_door  INTEGER NOT NULL CHECK (deepest_door BETWEEN 1 AND 24),
  run_time_ms   INTEGER NOT NULL CHECK (run_time_ms BETWEEN 10000 AND 1800000),
  deaths        INTEGER NOT NULL DEFAULT 0 CHECK (deaths BETWEEN 0 AND 99),
  seed          INTEGER NOT NULL,               -- run seed (schedule is fixed; seed = run id)
  created_at    TEXT    NOT NULL                -- ISO-8601 UTC
);
CREATE INDEX IF NOT EXISTS idx_scores_rank
  ON scores (deepest_door DESC, run_time_ms ASC, deaths ASC);
"""


def db_path() -> str:
    """DB file location; override with env HALLWAKE_DB (tests use a temp file)."""
    return os.environ.get("HALLWAKE_DB", os.path.join("data", "hallwake.db"))


def connect() -> sqlite3.Connection:
    path = db_path()
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    conn = connect()
    try:
        conn.executescript(DDL)
        conn.commit()
    finally:
        conn.close()


def insert_score(name: str, deepest_door: int, run_time_ms: int,
                 deaths: int, seed: int) -> tuple[int, int]:
    """Insert one run card; returns (id, rank) where rank = 1 + count of rows
    ranking strictly better by (deepest_door DESC, run_time_ms ASC, deaths ASC)."""
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    conn = connect()
    try:
        cur = conn.execute(
            "INSERT INTO scores (name, deepest_door, run_time_ms, deaths, seed, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (name, deepest_door, run_time_ms, deaths, seed, created_at),
        )
        rank = conn.execute(
            "SELECT COUNT(*) + 1 FROM scores"
            " WHERE deepest_door > ?"
            "    OR (deepest_door = ? AND run_time_ms < ?)"
            "    OR (deepest_door = ? AND run_time_ms = ? AND deaths < ?)",
            (deepest_door, deepest_door, run_time_ms,
             deepest_door, run_time_ms, deaths),
        ).fetchone()[0]
        conn.commit()
        return int(cur.lastrowid), int(rank)
    finally:
        conn.close()


def list_scores(limit: int) -> list[dict]:
    conn = connect()
    try:
        rows = conn.execute(
            "SELECT id, name, deepest_door, run_time_ms, deaths, created_at"
            " FROM scores"
            " ORDER BY deepest_door DESC, run_time_ms ASC, deaths ASC, id ASC"
            " LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
