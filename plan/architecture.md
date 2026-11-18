# HALLWAKE — architecture (Phase 5 REWRITE, 2026-11-18)

Replaces the GCRadar architecture entirely. Binding contract from plan/idea.md:
first-person horror corridor, 24 doors, 4 original entities, deterministic fixed
schedule, lantern oil, checkpoints, LLM flavor-only, original procedural art/audio.

## 1. Stack + why

- **Frontend: Vite + React 19 + TS (port 8402), raw Three.js (pinned `three@0.170`), no react-three-fiber.** The sim is a fixed-timestep pure reducer; R3F would fight that boundary. React renders HUD/menus only; the canvas is mounted once by a shell component. `zustand` for UI state (phase, HUD snapshot, leaderboard) — tiny, no router needed (kiosk has 4 screens, switched by uiStore phase).
- **Game core: deterministic TypeScript in `src/core/` — zero imports of THREE/DOM/WebAudio.** `stepSim(state, frame) -> state` is pure; entity FSMs are pure functions; vitest golden traces (hand-written input frame sequences -> expected state snapshots) prove determinism headlessly. This is the testable heart and the demo-reproducibility guarantee.
- **Backend: FastAPI (port 8401) + stdlib sqlite3.** Leaderboard + LLM flavor proxy ONLY. No ORM, no Postgres — one table, kiosk-scale writes. Flat layout matching the existing scaffold (`app/backend/main.py`, `routers/`, `tests/`).
- **No Rust.** The sim is ~24 rooms x a few entities at 60 Hz — trivially TS-fast; Rust would cost iteration speed for zero measurable gain.
- **Art/audio: procedural only.** Canvas-generated textures (wood grain, plaster, noise, door numerals) + WebAudio-synthesized cues. Zero downloaded assets = zero IP exposure, tiny repo.
- **Perf target: 60 fps @1080p on mid laptop iGPU (Iris Xe class).** Hard budget in §7, enforced by a pure `budget.ts` counter + vitest, measured by a week-2 spike before any polish.

## 2. Module map (frontend)

```
src/core/      pure deterministic sim (no THREE/DOM)   <- golden-trace tested
  types.ts     SimState, Frame, EntitySnapshot, SimEvent
  schedule.ts  the 24-door table (archetype, variant, event, checkpoint)
  sim.ts       createInitialState(), stepSim(state, frame) pure reducer
  entities.ts  GAUNT/MURMUR/TALLY/CINDER FSM step functions (pure)
  oil.ts       oil economy (drain, refill, 4x cinder drain)
  scoring.ts   run card + leaderboard validation (mirrors backend rules)
src/render/    Three.js scene graph, reads SimState only
  scene.ts     renderer, camera rig, fog, quality presets
  roomBuilder.ts  archetype geometry -> merged static meshes
  textures.ts  procedural canvas textures (cached, 256-512px)
  entities/    gaunt.ts murmur.ts tally.ts cinder.ts fx.ts (mesh factories + tell FX)
  budget.ts    pure mesh/light/draw-call counter over a scene plan
  playerController.ts  pointer lock, WASD, gamepad -> Frame
  loop.ts      fixed-timestep accumulator (dt=1/60), render reads latest SimState
  quality.ts   low/mid/high presets (light radius, texture size, fog density)
src/audio/     WebAudio synth graph, triggered by SimEvents
  graph.ts     buses + master chain; cues.ts     per-event synth cues
src/ui/        React: Hud, AttractScreen, DeathCard, RunCard, Leaderboard,
               NameEntry, LoreCard; state/uiStore.ts (zustand)
src/net/       flavorClient.ts, scoresClient.ts, canned.ts (>=30 lines/kind)
```

Backend: `main.py` (app, CORS, router includes), `db.py` (schema+queries),
`routers/scores.py`, `routers/flavor.py`, `llm.py` (vLLM client), `canned.py`.

## 3. Scene graph

```
Scene (fog: exponential, color #0a0a0e)
├─ RoomGroup            ONLY current room + prebuilt next room (2 alive max)
│   ├─ StaticMerged     walls+floor+ceiling merged per room (1 draw call)
│   ├─ PropsMerged      furniture merged per archetype (1-2 draw calls)
│   ├─ DoorMesh         real door (canvas numeral texture) + TALLY fake door
│   ├─ Sconces[]        3 emissive quads (CINDER rooms) — emissive mat, not lights
│   ├─ Alcoves[]        pale-paint nooks (GAUNT rooms) — emissive trim
│   └─ EntityGroup      active entity meshes (<=2 in finale)
├─ PlayerRig (camera)
│   └─ LanternSpot      THE single dynamic SpotLight (cone, distance ~ oil-scaled)
├─ EventLights[]        <=2 dynamic PointLights, only during active events
├─ BlobAO[]             dark disc meshes under props/entities ("baked" AO)
└─ (no post-processing pass; vignette is a CSS overlay div)
```

Light rule: 1 lantern SpotLight + at most 2 event PointLights = <=3 dynamic
lights, **no shadow maps anywhere**. "Baked look" = emissive materials + blob AO
discs + fog falloff + a pre-rendered canvas lightmap gradient on walls.

## 4. Room archetype system + 24-door layout

6 archetypes x 2 greybox variants (A/B). Geometry authored as data in
`roomBuilder.ts` (box primitives + extrusions), merged per room. Variant B =
mirrored plan + swapped prop set; same nav points (alcove/exit/sconce anchors
identical so entity paths stay schedule-keyed).

Fixed table (schedule.ts — identical every run; this IS the manifesto):

| Door | Archetype.Var | Event | Checkpoint |
|---|---|---|---|
| 1  | junction A  | spawn | yes |
| 2  | guest A     | safe (oil) | |
| 3  | wash A      | safe (lore) | |
| 4  | junction B  | safe | |
| 5  | junction A  | TALLY | yes |
| 6  | laundry A   | safe (oil) | |
| 7  | guest A     | GAUNT | |
| 8  | lounge A    | safe (oil) | |
| 9  | boiler A    | CINDER | yes |
| 10 | laundry B   | MURMUR | |
| 11 | guest B     | safe (lore) | |
| 12 | junction B  | TALLY | |
| 13 | guest A     | GAUNT | yes |
| 14 | wash B      | safe (oil) | |
| 15 | boiler B    | CINDER | |
| 16 | laundry A   | MURMUR | |
| 17 | lounge B    | safe | yes |
| 18 | junction A  | TALLY | |
| 19 | guest B     | GAUNT | |
| 20 | wash A      | safe (oil+lore) | |
| 21 | boiler A    | CINDER | yes |
| 22 | laundry B   | MURMUR | |
| 23 | lounge A    | safe (oil) | |
| 24 | boiler B    | FINALE: CINDER + GAUNT | |

Per-door deterministic params (in schedule.ts): GAUNT sweep path + alcove index
per door; CINDER sconce relight order per door (9:[0,1,2] 15:[2,0,1] 21:[1,2,0]
24:[0,2,1]); MURMUR spawn corner; TALLY fake numeral = expected+2 (never equals
the door log's expected number).

## 5. Entity state machines (tell -> event -> counterplay)

All FSMs live in `entities.ts`, stepped inside `stepSim`. Triggers are keyed to
(doorIndex, roomTick) — e.g. GAUNT tell fires at roomTick=60 on entry to doors
7/13/19. No RNG in the sim; even "organic" variation is a fixed per-door table.

**GAUNT** (doors 7,13,19 + finale): IDLE -> TELL (roomTick 60..204: every light
flickers twice then burns amber; door-slam cue) -> SWEEP (6.0 s along the door's
fixed path at 3.5 m/s) -> RESOLVE: player inside the door's alcove AND
|velocity| < 0.2 m/s for the sweep duration -> SURVIVED, else DEATH.
Counterplay: step into the pale-paint alcove, stand still until amber fades.

**MURMUR** (doors 10,16,22): spawns far corner. Every 60 ticks: if inside the
lantern cone (|yaw diff| <= 25 deg AND oil > 0.20) -> frozen; else advance one
1.2 m step toward player. Distance < 1.5 m -> DEATH. Tell: whisper gain
proportional to facing dot; lantern beam sputter FX when it is in the cone.
Counterplay: keep the beam on it, back toward the exit door — oil IS the clock.

**TALLY** (doors 5,12,18): IDLE -> TELL (chalk tally marks on frame; numeral
glows red for 1 s) -> FAKE_SPAWN (duplicate door mesh, numeral = expected+2).
Opening the fake door -> DEATH (it is a mouth). Opening the real door (numeral
== door log expected) -> advance. Counterplay: read the HUD door log.

**CINDER** (doors 9,15,21 + finale): IDLE -> TELL (flames turn blue, rising
hiss, oil drain x4) -> BLACKOUT (sconces extinguish one per 3 s; lantern radius
shrinks with oil) -> RELIGHT: interact with the 3 sconces in the door's scratch
order; each correct -> next; wrong order resets sequence. All 3 -> BANISHED,
oil refills to 0.60. Oil reaching 0 -> early GAUNT spawn -> DEATH.

**Door 24 finale**: CINDER blackout and GAUNT sweep run concurrently (GAUNT
tell delayed to roomTick 300 so the player must relight sconces AND reach the
alcove). Surviving opens the exit -> run card.

Death event: sim sets alive=false, freezes input for 90 ticks (1.5 s),
respawns at checkpoint door; doors inside the block re-lock and replay events.

## 6. Player loop, input, HUD

- **Movement:** walk 2.2 m/s, no sprint (booth: no stamina bookkeeping);
  collision = per-room AABB list from the archetype table (pure, in core).
- **Lantern oil:** scalar 0..1; drain 1/90 per second lit; sconce refills and
  safe-room oil cans set +0.35 (cap 1); CINDER drains x4; radius = 2 + 6*oil m.
  Below 0.20: tell FX suppressed (sim still fires events with `visible:false`),
  MURMUR/CINDER get stronger. One resource, four uses.
- **Checkpoints:** entering door in {1,5,9,13,17,21} sets checkpoint. Death ->
  respawn there with oil 0.6. Deaths counter feeds tiebreak + demo arc.
- **Input:** Pointer Lock API; WASD move, mouse look, E interact, Esc releases
  lock (pause overlay). Gamepad (SHOULD, same Frame producer): left stick move,
  right stick look, A/X interact. **Booth note: gamepad is the preferred kiosk
  input** — pointer lock on a shared kiosk mouse is hostile; both feed the same
  deterministic Frame stream, so gamepad adds zero sim risk.
- **HUD (React, reads a 10 Hz HUD snapshot from uiStore):** big door numeral;
  **door log** ("next: 6") — the TALLY counterplay surface; oil gauge (amber ->
  red under 0.2); tell indicator; interact prompt. Kiosk screens: attract
  (30 s idle auto-reset), death card (1.5 s + epitaph), run card (deepest door,
  time, deaths), leaderboard + name entry.

## 7. Render budget (enforced, not aspirational)

`budget.ts` computes {drawCalls, dynamicLights, triangles, texturesMB} from the
scene plan (pure data, no WebGL) and vitest asserts the caps:
**<=150 draw calls, <=3 dynamic lights, 0 shadow maps, <=120k tris, <=8 MB
canvas textures.** Current-room-only + next-room preload keeps the live scene
at ~2 rooms. Merged static geometry: 3-5 draws/room. Textures: 256 px props,
512 px walls, generated once, cached by key. Quality presets: low = lantern
radius x0.7, 256 px textures, denser fog; mid = default; high = +1 event light.
Dev FPS meter (toggle `?fps=1`). Week-2 spike measures real fps on the weakest
machine before any art polish (roadmap W2).

## 8. Audio graph (WebAudio synth only — original by construction)

```
masterGain -> DynamicsCompressor -> destination
 ├─ ambienceBus   brown-noise loop + 55 Hz sine drone (always on, gain 0.15)
 ├─ doorBus       thud: noise burst + lowpass sweep (open/slam)
 ├─ gauntBus      slam cue + amber hum (sawtooth 90 Hz + tremolo)
 ├─ murmurBus     whisper: filtered noise bursts, gain = facing dot (deterministic)
 ├─ tallyBus      chalk scratch (short bandpass noise), red-glow ping
 └─ cinderBus     blue-flame hiss (sawtooth rising sweep), sconce relight chime
```
`cues.ts` maps SimEvent.type -> synth recipe (pure data; vitest asserts every
event type has a cue). AudioContext created lazily on first input (kiosk
keypress resumes it). Zero audio files.

## 9. Data model (SQLite, `app/backend/data/hallwake.db`)

```sql
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
```
DB file is created on startup by `db.py` (executes the DDL above verbatim).
Frontend mirrors the same validation in `core/scoring.ts` and keeps a
localStorage mirror (`hallwake.scores.local`, last 20) so the kiosk works with
the backend down.

## 10. API contract (FastAPI :8401; frontend proxies /api via vite)

| Method/Path | Purpose | Request -> Response |
|---|---|---|
| GET /health | liveness + LLM probe cache | -> `{status:"ok", llm:{online:bool, model:string}}` |
| GET /api/scores?limit=10 | leaderboard (limit 1..50, default 10) | -> `{scores:[{id,name,deepest_door,run_time_ms,deaths,created_at}]}` ordered by idx_scores_rank |
| POST /api/scores | submit run (server-validated) | `{name,deepest_door,run_time_ms,deaths,seed}` -> 201 `{ok:true,id,rank}`; invalid -> 422 `{ok:false,error:string}` |
| POST /api/flavor | LLM flavor (display-only) | `{kind:"lore"\|"epitaph"\|"run", door:1..24, entity?:string, deaths?:0..99}` -> 200 `{available:bool, source:"llm"\|"canned", text:string}` (text <=240 chars, single line) |

Validation (server, mirrors core/scoring.ts): name regex `^[A-Za-z0-9 .'-]{1,12}$`;
deepest_door 1..24; run_time_ms 10000..1800000; deaths 0..99; seed int.
Unknown fields ignored; extra keys never 5xx. CORS: allow
`http://localhost:8402` and `http://127.0.0.1:8402`. `/api/flavor` NEVER
returns 5xx — LLM down is a 200 with `source:"canned"`.

## 11. LLM flavor firewall (binding)

- **Deterministic TS owns everything.** The sim never reads flavor text; flavor
  text is display-only DOM (`textContent`, never innerHTML, never parsed).
- **Server (`routers/flavor.py` + `llm.py`):** httpx.AsyncClient to
  `http://100.124.134.63:8890/v1` (env `HF_LLM_URL`), model `qwen3.8-flash-next`
  (env `HF_LLM_MODEL`), no key, **timeout 0.8 s, no retries**, semaphore(1).
  Prompt per kind (lore: door+archetype+entity, epitaph: door+entity+deaths,
  run: door+time+deaths), max_tokens 80, temp 0.8. Response sanitized: strip
  control chars/HTML, collapse to one line, truncate 240. Any failure (timeout,
  offline, empty, garbage) -> 200 `{available:false, source:"canned", text}`
  from `canned.py` pools (>=30 lines/kind, chosen by `(kind, door) % len` —
  deterministic).
- **Client (`net/flavorClient.ts`):** AbortController 800 ms; on any failure use
  local `canned.ts` (>=30/kind). Fallback text is first-class content; the game
  is 100% playable and fully scored with backend AND LLM down.
- LLM output never influences: entity triggers, oil, scoring, leaderboard.

## 12. ip-check.sh spec (`scripts/ip-check.sh`)

Purpose: CI gate that no DOORS/Roblox IP leaks into shipped material.
- Scan roots: `app/`, `scripts/`, `.github/`, `README*` (repo root).
- Excludes: `node_modules/`, `dist/`, `.venv/`, `.git/`, `data/`, `plan/`,
  `research/` (internal planning docs discuss the genre meta; they are not
  shipped).
- Case-insensitive patterns: `roblox`, `lsplash`, `rococo`, `screech`, `stonk`,
  `amity`, `dupe`, `hallwake`-knockoffs n/a. Case-sensitive whole-word
  patterns (generic English words, so case-guarded): `DOORS`, `Rush`, `Figure`,
  `Halt`, `Glitch`, `Jeff`, `Eyes`, `Blink`.
- Implementation: `grep -rnwE` per pattern set with `--exclude-dir` flags;
  print `file:line:match`; exit 1 on any hit, 0 clean.
- `--selftest`: writes a temp file containing `Roblox` under a mktemp dir,
  runs the scan against it, asserts exit 1; then asserts clean repo scan exits
  0. Both must pass for the script to exit 0.
- CI (`.github/workflows/ci.yml`): ip-check + `npm run build` + `npx vitest run`
  + `python -m pytest -q` on every push.

## 13. Determinism + testing strategy

- Sim is pure; `loop.ts` feeds it Frames from input at fixed dt=1/60 with an
  accumulator (max 5 catch-up steps, then drop). Same input stream -> identical
  state at every tick (float ops are IEEE-deterministic in one engine; no
  Math.random in core — grep-enforced by a vitest source scan).
- **Golden traces** (`src/core/__tests__/`): hand-written frame sequences with
  hand-computed expected snapshots: gaunt7_survive, gaunt7_death_moving,
  murmur10_beam_walk, murmur10_oil_out_death, tally5_fake_door_death,
  cinder9_relight_order, checkpoint_respawn, finale24. Assert exact fields
  (alive, door, oil band, entity phase) — not full float equality on positions.
- Backend: TestClient tests for scores validation + flavor offline degrade.
- Browser checks are orchestrator-gate only (no Playwright in build tasks).
