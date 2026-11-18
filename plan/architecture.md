# GCRadar — Technical Architecture (Phase 5, 2026-11-18)

Binding contract: `plan/idea.md`. Ports: backend **8401**, frontend **8402**. LLM: local vLLM
`http://100.124.134.63:8890/v1`, model `qwen3.8-flash-next`, OpenAI-compatible, no key,
narration-only firewall. App must be fully functional with the LLM down.

## 1. Stack + why

| Layer | Choice | Rationale |
|---|---|---|
| Backend | **FastAPI + uvicorn (Python 3.12), stdlib `sqlite3`, no ORM** | The tech core is pure Python functions (state machine + matrix math) — PyCharm evidence + pytest golden tests. Raw SQL keeps the SQLite file a first-class artifact for **DataGrip**; an ORM would add a layer we never need. |
| DB | **SQLite single file** `app/backend/data/gcradar.db` | Read-mostly curated store, one writer (seed script). Postgres buys nothing for 10–12 teams / ~300 edges. |
| Frontend | **Vite + React 18 + TypeScript, `react-router-dom` only** | 5 screens, server is source of truth → no Redux/react-query. **Hand-rolled SVG charts** (bar, stacked bar, sparkline, tier grid, matrix heat cells): full control for the original design system, zero chart-lib dep, and form charts sit on the cut ladder anyway. |
| Rust | **Not used** | Matrix is ~300 edges; scoring is microseconds in Python. Rust would only slow iteration. |
| Realtime | **None** (see §7) | |

No other frameworks. Deps: `fastapi uvicorn httpx pydantic pytest` / `react react-dom react-router-dom vitest typescript`.

## 2. Topology

```
Browser → Vite dev server :8402 (proxy /api → :8401) → FastAPI :8401
FastAPI → SQLite file (curated store)
FastAPI → vLLM :8890 (narration only; guarded; offline-degradable)
scripts/fetch_static.py → valorant-api.com (build-time only) → data/static/*.json → seed tables
```
App never calls valorant-api.com at runtime. Static content = factual names only; no Riot art,
no hotlinked assets, original iconography only.

## 3. Data model (DDL — `app/backend/app/db/schema.sql`)

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  tag TEXT NOT NULL UNIQUE,                  -- 3-4 char text tag; NO logos/trademarks
  region TEXT NOT NULL,
  accent TEXT NOT NULL,                      -- design-token hex, original palette
  notes TEXT
);

CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  gamertag TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Duelist','Initiator','Controller','Sentinel','Warden')),
  country TEXT,
  joined TEXT                                -- ISO date, nullable
);

CREATE TABLE agents (
  code TEXT PRIMARY KEY,                     -- lowercase slug, e.g. 'jett'
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Duelist','Initiator','Controller','Sentinel','Warden')),
  release_order INTEGER
);

CREATE TABLE maps (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE agent_pools (                   -- team comfort tiers (the scouted pool)
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_code TEXT NOT NULL REFERENCES agents(code),
  tier INTEGER NOT NULL CHECK (tier IN (1,2,3)),   -- 1 signature, 2 solid, 3 flex
  pick_rate REAL NOT NULL DEFAULT 0 CHECK (pick_rate BETWEEN 0 AND 1),
  primary_map TEXT REFERENCES maps(code),
  note TEXT,
  PRIMARY KEY (team_id, agent_code)
);

CREATE TABLE agent_map (                     -- scene-wide play rate per map
  agent_code TEXT NOT NULL REFERENCES agents(code),
  map_code TEXT NOT NULL REFERENCES maps(code),
  play_rate REAL NOT NULL DEFAULT 0 CHECK (play_rate BETWEEN 0 AND 1),
  note TEXT,
  PRIMARY KEY (agent_code, map_code)
);

CREATE TABLE results (
  id INTEGER PRIMARY KEY,
  team_a INTEGER NOT NULL REFERENCES teams(id),
  team_b INTEGER NOT NULL REFERENCES teams(id),
  map_code TEXT REFERENCES maps(code),       -- NULL = series-level result
  date TEXT NOT NULL,
  event_tag TEXT NOT NULL,
  score_a INTEGER NOT NULL CHECK (score_a BETWEEN 0 AND 13),
  score_b INTEGER NOT NULL CHECK (score_b BETWEEN 0 AND 13),
  CHECK (team_a <> team_b)
);

CREATE TABLE matrix_edges (                  -- curated synergy/counter matrix
  id INTEGER PRIMARY KEY,
  agent_a TEXT NOT NULL REFERENCES agents(code),
  agent_b TEXT NOT NULL REFERENCES agents(code),
  axis TEXT NOT NULL CHECK (axis IN ('synergy','counter')),
  score REAL NOT NULL CHECK (score BETWEEN -1 AND 1),
  confidence REAL NOT NULL DEFAULT 0.7 CHECK (confidence BETWEEN 0 AND 1),
  note TEXT NOT NULL,                        -- source/rationale REQUIRED on every edge
  CHECK (agent_a <> agent_b),
  UNIQUE (agent_a, agent_b, axis)
);
-- 'counter' is directional: (a,b,'counter',+s) = a counters b. 'synergy' is symmetric;
-- the loader treats synergy edges as (a,b)==(b,a).

CREATE TABLE weights (                       -- adjustable, live-editable, echoed in every score
  key TEXT PRIMARY KEY CHECK (key IN ('role','synergy','counter','map','threat')),
  value REAL NOT NULL CHECK (value BETWEEN 0 AND 2),
  label TEXT NOT NULL
);

CREATE TABLE archetypes (                    -- cut-ladder #4; tables may ship with UI cut
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);
CREATE TABLE archetype_agents (
  archetype TEXT NOT NULL REFERENCES archetypes(code),
  agent_code TEXT NOT NULL REFERENCES agents(code),
  weight REAL NOT NULL DEFAULT 1,
  PRIMARY KEY (archetype, agent_code)
);
```

## 4. Deterministic analyzer spec (`app/backend/app/analyzer/` — pure functions, no I/O)

Input types (`types.py`, dataclasses): `Edge(agent_a, agent_b, axis, score, confidence, note)`,
`AgentMeta(code, role)`, `PoolEntry(agent_code, tier, pick_rate)`, `Weights(role, synergy,
counter, map, threat)`. All functions take these plain structures; DB→type loading lives in
`app/services/store.py` (task T4), so the analyzer is testable with in-memory fixtures.

### 4.1 Draft state machine (`draft.py`) — VCT-style, factual rules
Phase script (data-driven constant `PHASE_SCRIPT`, so a rules fix is one edit):
1. `side` — Team A chooses attacker/defender.
2. Ban phase 1 — 6 bans alternating **B,A,B,A,B,A**.
3. Pick phase 1 — 8 picks in order **A,B,B,A,A,B,B,A** (each team 4).
4. Ban phase 2 — 2 bans **B,A**.
5. Counter-pick — 2 picks **B,A**. (Total: 8 bans, 10 picks, 5 agents per team.)

`Action = {type: 'side'|'ban'|'pick', team: 'A'|'B', agent?: str, side?: 'attack'|'defend'}`.
`replay(actions) -> DraftState {phase_index, next_actor, bans, picks{A,B}, sides, legality{ok, error}}`.
Illegal iff: wrong team's turn, agent already banned/picked, re-pick of same agent, unknown
agent code, or action after completion. Final state must have exactly 5 picks per team.
The API is **stateless**: client sends the full action list each request; server replays.
No session store, trivially testable, restart-proof.

### 4.2 Scoring (`matrix.py`, `roles.py`) — every number on every screen comes from here
- `role_coverage(comp)`: `|distinct roles| / 5`, minus 0.1 per role held by >2 agents, floor 0. → [0,1]
- `synergy(comp)`: over all unordered pairs, `sum(edge.score * edge.confidence)` (missing edge = 0), `/ max(1, |pairs|)`. → [-1,1]
- `counter_vs(ally, enemy)`: over all a×e pairs: `+edge(a,e,'counter')` if a counters e, `-edge(e,a,'counter')` if e counters a, each `* confidence`, `/ (|ally|*|enemy|)`. → [-1,1]
- `map_fit(comp, map)`: mean of `agent_map[agent,map].play_rate`. → [0,1]
- `threat(agent, opponent_pool)`: tier base {1:1.0, 2:0.6, 3:0.3, absent:0} `* (0.5 + 0.5*pick_rate)`. → [0,1]
- `comp_score = 100 * ( w_role*role_coverage + w_syn*synergy_n + w_ctr*counter_n + w_map*map_fit ) / (w_role+w_syn+w_ctr+w_map)` where `x_n = (x+1)/2` for the [-1,1] terms. → [0,100]
- `counter_pick_ranking(ally_comp, enemy_comp, available, opponent_pool, map, weights)`: for each available agent, `rank = w_ctr*counter_n(single vs enemy) + w_threat*threat(agent, opponent_pool) + w_map*map_fit(single) + w_role*role_need` where `role_need = 1.0` if ally lacks that role, `0.3` if held once, else `0`. Return top 5, each with a **reason chain**: the top-3 contributing edges (agent pair, score, confidence, note) plus threat/role facts. This is the matchup-conditioned differentiator.
- Every response echoes the exact `weights` used (transparency panel + demo beat).

### 4.3 Golden tests (`app/backend/tests/`)
Hand-computed JSON fixtures in `tests/golden/` (expected values written by hand BEFORE code):
`fixture_small.json` (2×5 comp, 6 edges, expected comp_score to 4 dp), `fixture_counter.json`
(ranked counter-pick order + reason chains), `fixture_draft_flow.json` (full 18-action legal
draft + 4 illegal-action cases). `pytest` must pass with zero network.

## 5. API contract (FastAPI, prefix `/api`; JSON; pydantic-validated)

| Method/Path | Description | Request → Response |
|---|---|---|
| GET `/api/health` | liveness + LLM reachability | → `{status:'ok', llm:{online:bool, model:str, checked_at}}` |
| GET `/api/agents` | static agent catalog | → `{agents:[{code,name,role}]}` |
| GET `/api/maps` | static map catalog | → `{maps:[{code,name}]}` |
| GET `/api/teams` | team list for hub | → `{teams:[{id,name,tag,region,accent,record:{w,l}}]}` |
| GET `/api/teams/{id}` | dossier payload | → `{team, roster:[{gamertag,role,country}], pool:[{agent_code,tier,pick_rate,note}], events:[str]}` |
| GET `/api/teams/{id}/form` | form series for charts | → `{series:[{date,event_tag,opponent_tag,result:'W'|'L',score}]}` |
| GET `/api/matchup?team_a=&team_b=` | computed matchup prep | → `{overlap:[{agent_code,tier_a,tier_b}], ban_pressure:[{agent_code,threat,reason}], role_gaps:{A:[roles],B:[roles]}, matrix_summary:{top_synergies:[edge],top_counters:[edge]}}` |
| POST `/api/draft/score` | replay draft + live scores + counter-picks | `{map_code, team_a_id, team_b_id, actions:[Action], weights?}` → `{state, legality, scores:{A:comp_score_breakdown, B:...}, counterpicks:{A:[RankedPick],B:[RankedPick]}, weights_used}` |
| GET `/api/weights` | current weights | → `{weights:[{key,value,label}]}` |
| PUT `/api/weights` | adjust (transparency demo) | `{weights:[{key,value}]}` → same as GET |
| POST `/api/comp/analyze` | standalone comp score (Comp Lab) | `{agents:[5 codes], map_code, opponent_team_id?}` → `{score, breakdown:{role,synergy,counter,map}, counterpicks:[RankedPick]?, archetypes?:[code]}` |
| GET `/api/matrix?agent=` | edges for explain panel | → `{edges:[{agent_a,agent_b,axis,score,confidence,note}]}` |
| POST `/api/ai/narrate` | LLM narration (never computes) | `{kind:'dossier'|'draft'|'bullets', id}` → `{available:true, text}` or `{available:false, reason:'model_offline'}` — **always HTTP 200** |
| POST `/api/ai/qa` | Q&A over computed stats (cut-first) | `{question, scope:{kind:'team'|'draft'|'comp', id}}` → `{available:true, answer, cites:[stat_keys]}` or `{available:false}` |

`RankedPick = {agent_code, rank_score, reasons:[{kind:'edge'|'threat'|'role'|'map', text, confidence?}]}`.
`comp_score_breakdown = {total, parts:{role,synergy,counter,map}, weights_used}`.

## 6. LLM layer (`app/services/llm.py` + `app/routers/ai.py`) — narration-only firewall

- Client: `httpx.AsyncClient`, base URL env `GCRADAR_LLM_URL` (default the vLLM host), model
  `qwen3.8-flash-next`, no key. **`asyncio.Semaphore(1)`** — one local engine, serialize
  requests. Timeout 12 s, **no retry** (fail fast, demo-safe).
- Health probe: `GET /models` cached 30 s; result feeds `/api/health` and the frontend's
  global "model offline" banner.
- Inputs are **only** the deterministic layer's JSON (server-built; the client never sends
  facts). System prompt: restate only facts present in CONTEXT; introduce no new names or
  numbers. Output forced JSON (`response_format={"type":"json_object"}`) validated against a
  per-kind pydantic schema; prompts kept small (<1.5k tokens) for the local model.
- **Novel-number guard** (`app/services/llm_guard.py`): extract numeric tokens from output; any
  number not present in the input context → discard output, return `{available:false,
  reason:'guard_rejected'}`. The LLM never emits a stat.
- Degrade behavior: any failure (timeout, refused, schema-invalid, guard) → HTTP 200
  `{available:false}`. Zero deterministic feature degrades; frontend renders a clear
  "model offline" placeholder. Never a 5xx for LLM-down.
- Tests: httpx MockTransport fixtures (offline, slow, garbage-output, guard-hit) + one
  `@pytest.mark.live` test that hits the real vLLM only if reachable (skipped in CI).

## 7. Realtime: none — justified

Single-user scouting tool. Every state change is a user-initiated request/response
(stateless draft replay in §4.1). No concurrent editors, no live-match ingestion (cut in
idea.md), no multiplayer. WebSockets/polling/SSE would add failure modes and zero value.
The only "push" need is LLM-offline status, handled by the cached health probe on load.

## 8. Screen inventory (5 — hard cap)

1. **Hub** — team grid (tag, region, record), search.
2. **Team Dossier** — roster, agent-pool tier grid, form chart, event tags, LLM blurb panel.
3. **Matchup Prep** — A vs B: pool overlap, ban-pressure, role gaps, matrix summary.
4. **Draft Board** — pick/ban board, live comp scores, ranked counter-picks with reason
   chains; **Explain/weights side panel** (panel, not a screen).
5. **Comp Lab** — pick 5 + map + optional opponent → score breakdown + archetype tags.

LLM Q&A is a **panel** inside Draft Board and Dossier — cutting it (cut ladder #1) never
drops a screen.

## 9. Seed-data curation plan (week-1 task, capped)

- Candidates (curator verifies current rosters/events before entry): G2 Gozen, Cloud9 GC,
  Sentinels GC, Team Liquid GC, 100 Thieves GC, NRG GC, Shopify GC, MIBR GC, FURIA GC,
  KRÜ GC, LEV GC, MIND GC → pick **10–12**.
- Depth targets (machine-checked by `scripts/check_seed.py`): 10–12 teams; ≥70 players
  (5–7/team); every team 6–10 pool entries with tier+pick_rate; ≥6 results/team (real GC
  events, hand-entered public facts); 24–26 agents; 7 maps; **≥200 matrix edges** each with
  confidence + non-empty note; agent_map coverage for all agents×maps; 5 default weights.
- Source posture: hand-entered public knowledge; no scraping, no third-party IP in repo;
  factual names only; no logos (text tags); valorant-api.com static fetch at build time.
- CSVs in `app/backend/app/db/seed/` → `scripts/load_seed.py` → `gcradar.db`. DataGrip opens
  the db directly (JetBrains evidence). Analyzer is data-independent: golden tests use
  in-memory fixtures, so curation depth never blocks the tech core.

## 10. Testing strategy

Backend: pytest only (golden analyzer fixtures, seed integrity, API via `fastapi.TestClient`,
LLM via MockTransport). Frontend: vitest on pure helpers + `tsc && vite build` as contract
check. No browser-in-agent tests; browser verification is orchestrator-gate only.

## 11. Repo layout

```
app/backend/  app/{main,config}.py app/db/{schema.sql,seed/*.csv} app/analyzer/ app/services/
              app/routers/ scripts/{load_seed,check_seed,fetch_static}.py data/ tests/
app/frontend/ src/{main,App,routes}.tsx src/api/ src/pages/ src/components/ src/fixtures/
              package.json vite.config.ts (port 8402, proxy /api→8401)
.idea/ .junie/ LICENSE README.md            (committed from first commit — Stage One evidence)
```
