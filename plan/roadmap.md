# HALLWAKE — roadmap (Phase 5 REWRITE, 2026-11-18)

Deadline: **Jan 12, 2027 @ 11:00am PST**. Solo builder, ~20-30 h/week budgeted.
Task ids reference plan/tasks.json. Wave order: W1 {T1,T5,T6,T7} -> W2 {T2} ->
W3 {T3,T4} (operator runs one agent at a time; waves = scheduling flexibility).

## Week 1 — Nov 18-24 — deterministic core + backend (foundation) (~38 h)

- T1 core sim + golden traces (20 h) — schedule table, 4 FSMs, oil, scoring.
- T5 leaderboard API (8 h) · T6 flavor firewall (8 h) · T7 ip-check + CI (2 h).
- Milestone M1: `vitest run src/core` green (8 golden traces), pytest green,
  ip-check green. Sim playable headlessly (trace-driven).

## Week 2 — Nov 25-Dec 1 — RENDERER + PERF SPIKE (before any polish) (~28 h)

- T2: greybox 24-door run in Three.js, procedural textures, pointer-lock +
  WASD + gamepad Frame producer, fixed-timestep loop, budget.ts caps.
- **PERF SPIKE (idea.md risk 1): measure real fps on the weakest available
  machine at end of week.** Gate: 60 fps @1080p mid, >=45 fps on weakest.
- Milestone M2: whole run walkable greybox, box entities, budget tests green.
- **=== CUT LINE A (perf) ===** if gate fails: single room variant, lantern
  only (0 event lights), low preset default, fog-increased draw culling.
  Perf fixes are geometry/light budget cuts, never sim changes.

## Week 3 — Dec 2-8 — entities + HUD/kiosk (full loop) (~34 h)

- T3 entity meshes + tell FX + WebAudio graph (18 h).
- T4 HUD (door log, oil gauge) + attract/death/run/leaderboard + net clients
  with canned fallbacks (16 h).
- Milestone M3 (idea.md hard cap): **full loop greybox end-to-end** —
  attract -> 24 doors with all 4 tells -> death -> checkpoint retry -> finale
  -> run card -> leaderboard -> kiosk idle reset.
- **=== CUT LINE B (scope) ===** if M3 missed: apply idea.md §8 ladder NOW,
  not mid-sprint: (1) gamepad (2) room 2nd variants (3) LLM lore -> canned
  (4) TALLY -> 3-entity renumber (5) online leaderboard -> localStorage.
  **NEVER cut:** movement, doors, remaining tells, lantern/oil, retry, kiosk.

## Week 4 — Dec 9-15 — art pass (bounded, procedural only) (~24 h)

- Textures: wood/plaster/noise/lightmap-gradient canvases; door hardware
  detail re-implemented from operator's doors.html reference (hinge/panel/knob,
  Three.js primitives — not copied). Entity silhouettes + tell FX polish
  (amber flicker, blue flame, chalk, moth cluster). Blob AO discs + fog tune.
- No new mechanics. ip-check stays green (no banned terms in comments/names).

## Week 5 — Dec 16-22 — SHOULDs + balance (~20 h)

- Gamepad polish (booth-preferred input), quality toggle (low/mid/high),
  room variant B pass (if not cut), lore card wiring (LLM live + canned),
  leaderboard UX, difficulty balance pass (oil tuning, GAUNT windows) using
  golden traces + live playthroughs.

## Week 6 — Dec 23-29 — QA + kiosk hardening (~20 h)

- 8 h kiosk soak (attract loop, 30 s idle reset, no leaks), fps re-check on
  weakest machine, death/retry edge cases, backend-down mode (localStorage),
  LLM-down mode (canned), Phase-9 QA gate + security pass, ip-check CI green.

## Week 7 — Dec 30-Jan 5 — presentation (~24 h)

- Demo video (<3 min, idea.md §13 script — deterministic schedule makes every
  take identical), README + methodology write-up, JetBrains evidence: commit
  .idea/ + .junie/ folders (WebStorm/PyCharm/DataGrip/Junie), category
  description noting web stack allowed (Rider "recommended" not required).
- Submission draft by Jan 5.

## Buffer — Jan 6-11

- Judge dry-run (fresh machine, fresh browser), final video frame pass
  (manual IP check of every frame), Devpost checklist, submit Jan 12.

## Standing rules

- Weekly "cut, don't cram" review; cut ladder is pre-agreed (idea.md §8).
- No downloaded art/audio, ever. No paid APIs, ever.
- Core loop (door -> tell -> counterplay -> death -> retry -> leaderboard)
  is never cut — it is the feasibility floor and the demo spine.
