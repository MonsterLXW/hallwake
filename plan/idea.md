# Winning idea — binding contract (Phase 4 REWRITE, 2026-11-18)

Operator-fixed concept: first-person horror-corridor mini game in the spirit of the Roblox
genre of numbered-door corridor horror (numbered doors one by one, lurking entities, light
mechanics). This document does NOT re-litigate the concept — it scopes it into a winning,
buildable Category 3 entry. Original IP only: zero DOORS/Roblox names, assets, or entity
names anywhere in repo, UI, or video.

## 0. Title (original IP)

**PICK: HALLWAKE** — coined compound (hall + wake: the corridor you walk, the vigil you keep,
the trail an entity leaves). Zero trademark collisions known, un-Googleable = un-collidable.
Backups, in order: **LANTERN ROW**, **DOORWAKE**, **THRESHOLD NIGHT**. Never use "DOORS",
"Roblox", "LSPLASH", "Rococo", or any DOORS entity name (Rush, Screech, Figure, Halt, Glitch,
Jeff, Dupe, Eyes, Amity, Blink, Stonk…) in repo, code, comments, UI, or video script.

## 1. Thesis

**Learnable horror, not luck.** Every scare is scripted to a fixed door number and telegraphed
with a readable tell — no RNG the player can't read. The corridor is the same every run;
survival is knowledge, and the booth leaderboard rewards knowledge (deepest door + time), not
dice. This is simultaneously the design manifesto (Quality of Idea), the demo-video spine
(Presentation), and the booth-fit answer (Impact): a 3–5 minute kiosk loop with checkpoints and
a leaderboard that a passerby can learn, die to, retry, and beat.

**The one ambitious differentiator:** the numbered door itself is an entity (**TALLY**) — the
doors are not just level structure, they are part of the bestiary. Nobody else in this contest
will build a horror mini game at all; nobody will make the door numbers diegetic.

## 2. Core loop (booth session, 3–5 min)

Attract screen (idle kiosk) → press any key → spawn at Door 1 → walk room-to-room, open each
numbered door to advance → each event room plays a scripted encounter (read tell → counterplay)
→ safe rooms between: refill lantern oil, read a lore card → die → 1.5 s death card (LLM epitaph
or canned line) → instant respawn at last checkpoint → reach Door 24 (finale combo) → run card
(deepest door, time, deaths) → name entry on local leaderboard → attract screen after 30 s idle.

## 3. Structure — sized for solo scope

- **One floor, 24 doors.** Not 30: 24 = 6 checkpoint blocks of 4, fits 3–5 min, fits a solo
  artist's month.
- **6 room archetypes × 2 greybox variants** (corridor junction, guest room, laundry/storage,
  lounge, boiler room, washroom). Rooms are re-skinned/rearranged between doors — the number
  and small prop seeds change, geometry is reused.
- **Fixed event schedule** (same every run — this is the manifesto):
  - TALLY at doors 5, 12, 18 · GAUNT at 7, 13, 19 · CINDER at 9, 15, 21 · MURMUR at 10, 16, 22
  - Door 24 finale: CINDER blackout + GAUNT chase in one room.
  - All other doors: safe rooms with oil refills, lore cards, optional chalk hints.
- **Checkpoints at doors 1, 5, 9, 13, 17, 21.** Death never sends a booth player to the start.

## 4. Entity roster — 4 originals, deterministic, telegraphed

Each entity: **tell** (audio + visual, always fires before the mechanic), **mechanic**,
**counterplay**. Behavior is scripted per door index; a player who saw it once can beat it
every time. No unreadable RNG anywhere.

1. **GAUNT** — tall stitched-silhouette that walks straight through the room.
   Tell: every light in the room flickers twice, then burns amber; a door slams behind you.
   Mechanic: 6-second window; GAUNT sweeps the room along a fixed path.
   Counterplay: step into a lit alcove/wardrobe nook (marked with pale paint) and stay still
   until the amber fades. Wrong nook or moving = death.
2. **MURMUR** — a face-in-the-wall / moth-swarm that only moves in darkness.
   Tell: whispering that grows louder when you face its direction; your lantern beam sputters
   when it is in your cone.
   Mechanic: each second it is outside your light cone it advances one step toward you.
   Counterplay: keep the lantern beam on it and back toward the exit door; oil management IS
   the counterplay. Beam on it = frozen.
3. **TALLY** — the door-number trickster; it edits the doors.
   Tell: fresh chalk tally marks on the doorframe; the door number glows red for one beat.
   Mechanic: TALLY adds a duplicate fake door in the room — opening it is death (it is a mouth).
   Counterplay: the HUD door log shows the next expected number; the real door's number matches
   the log, the fake never does. Reading the numbers IS the game.
4. **CINDER** — a wandering flame-wraith that eats light.
   Tell: all flames in the room turn blue; a rising hiss; lantern oil drains 4× faster.
   Mechanic: room lights go out one by one; your lantern radius shrinks toward zero (total
   darkness = GAUNT spawns early).
   Counterplay: relight the wall sconces in the order of the scratch marks beside them
   (deterministic order shown in-room) to banish CINDER and restore oil.

## 5. Light / safety mechanic

Lantern oil is the single resource: scalar 0–1, full tank ≈ 90 s of light; radius scales with
oil; sconces and Cinders' aftermath refill it. Light gates everything: tells are only visible
above 20% oil; MURMUR and CINDER feed on low light; GAUNT's alcoves are the only lit safe
spots. One mechanic, four uses — coherent design, cheap to implement, readable on camera.

## 6. Death / retry loop

Death: 1.5 s freeze + vignette + epitaph card → respawn at checkpoint, doors inside the block
re-lock and re-play their events (learnable, replayable). Deaths counter feeds the leaderboard
tiebreak and the demo narrative ("watch them learn door 7").

## 7. Deterministic core vs LLM flavor — the firewall

- **Deterministic TS owns everything:** movement, door state machine, entity schedules and
  hitboxes, oil economy, scoring, leaderboard validation. The sim never reads LLM output.
- **LLM (local vLLM via FastAPI proxy, optional) owns flavor only:** lore cards on door entry,
  death epitaphs, item flavor lines. Frontend fires the request async with an 800 ms timeout;
  on timeout/down it shows hand-authored fallback lines (≥30 canned per context). The game is
  100% playable and fully scored with the LLM down — fallback text is first-class content.
- LLM output is display-only DOM text; it is never parsed back into game state.

## 8. MUST / SHOULD / CUT ladder (core loop is never cut)

**MUST (the game):** pointer-lock FPS movement; 24-door single floor with the fixed event
schedule; all 4 entities with tells; lantern/oil + sconce refills; death→checkpoint retry;
HUD (door number, door log, oil gauge); attract/idle-reset kiosk mode; original procedural art
+ WebAudio-synthesized sound; deterministic (seeded, identical every run).
**SHOULD:** FastAPI+SQLite leaderboard with name entry; lore cards (LLM flavor); 2nd variant of
each room archetype; gamepad support (Gamepad API) alongside mouse+keyboard; quality toggle
(low/mid light budget); run card share screen.
**CUT ladder, in order if time runs out:** (1) gamepad, (2) room 2nd variants → single variant,
(3) LLM lore → canned-only, (4) TALLY entity → 3-entity roster (renumber schedule), (5) online
leaderboard → localStorage high scores. **Never cut:** movement, doors, remaining entities'
tells, lantern, retry loop, kiosk mode. Even compressed to a 36 h sprint, the MUST core
(greybox corridor + GAUNT + lantern + checkpoints) is achievable — that is the feasibility floor.

## 9. Tech plan

- **Frontend:** Vite + React + TS (scaffold exists; add `three` pinned, no react-three-fiber —
  raw Three.js scene graph driven by a fixed-timestep sim loop inside one React shell; React
  renders HUD/menus only; zustand for UI state). Pointer Lock API; WASD + mouse look + E
  interact; Gamepad API as SHOULD.
- **Art budget (all original, zero asset packs):** low-poly primitives + extrusions;
  canvas-generated procedural textures (wood grain, plaster, noise); all sound synthesized in
  WebAudio (original by construction, zero IP/copyright exposure). Door visuals reference the
  operator's Door Workshop (C:/Users/Dell P7 03260/doors.html) for hinge/panel/knob detail —
  re-implemented in Three.js, not copied.
- **Perf budget (booth hardware unknown = assume mid-range laptop / Iris Xe):** ≤3 dynamic
  point lights + emissive materials, no shadow maps (baked blob AO), merged static geometry per
  room, <150 draw calls, 60 fps at 1080p target; dev FPS meter; low quality preset (smaller
  light radius, no post pass). **Perf spike in week 2, before any art polish.**
- **Backend:** FastAPI :8401 — `/flavor` (proxy to local vLLM, server-side timeout + fallback),
  `/scores` (SQLite leaderboard, server-validated: max door + time sanity checks), `/health`.
  Game runs fully with backend down (localStorage mirror of scores).
- **JetBrains evidence:** WebStorm (TS/game), PyCharm (FastAPI), DataGrip (SQLite schema),
  Junie sessions + committed `.idea`/`.junie` folders; methodology write-up = the AI-workflow
  story. Rider is "recommended" for Cat 3, not required — web stack is allowed; say so in the
  description.

## 10. Rubric mapping (5 × 0.2, equal weights)

- **Technological Implementation (8/10):** a real first-person 3D game in the browser with a
  fixed-timestep deterministic sim, scripted entity AI, light-economy systems, FastAPI+SQLite
  leaderboard, LLM firewall with graceful degradation — visibly non-trivial; tool depth shown
  across three JetBrains IDEs + Junie.
- **Design (8/10):** one coherent loop end-to-end (attract → run → die → retry → leaderboard →
  attract), one resource (oil) with four uses, consistent horror identity (Phase 6 replaces
  tokens.css); small and finished, not broad and half-built.
- **Potential Impact (7/10):** the weakest axis honestly — countered by booth-fit evidence:
  kiosk idle-reset, 3–5 min sessions, checkpoints for first-timers, leaderboard for repeat
  crowds. The credible audience is real and named: event organizers running booth floors
  (Cloud9's own category use case), plus the huge Roblox-era corridor-horror audience reached
  on the open web.
- **Quality of the Idea (8/10):** "learnable horror, no unreadable RNG" manifesto + doors as a
  diegetic entity (TALLY); a design essay the judges can quote, not just a genre clone.
- **Presentation (9/10):** gameplay footage demos itself; scripted events make the video
  reproducible take-after-take; death→retry→mastery is a ready-made 3-minute story arc.
**Expected: 80/100 risk-adjusted.** A balanced entry beats a lopsided one under equal weights.

## 11. Finalist variants — adversarial re-score, why each lost

Six scoped variants of the fixed concept, scored under the real 5×0.2 rubric with build-risk
and demo-risk arguments:

| Variant | TI | D | PI | QI | PR | Total | Fatal objection |
|---|---|---|---|---|---|---|---|
| **A. HALLWAKE — learnable corridor (WINNER)** | 8 | 8 | 7 | 8 | 9 | **80** | — |
| B. Two-player co-op corridor (asymmetric booth duo) | 8 | 7 | 8 | 8 | 8 | 75 | Solo 7 weeks + netcode/sync + two-player booth choreography = build risk unacceptable; one broken sync bug kills the demo. |
| C. Endless procedural floors | 7 | 6 | 6 | 6 | 7 | 66 | Kills the manifesto (runs differ → knowledge worthless → leaderboard meaningless); content variety to feel alive exceeds solo art budget. |
| D. Puzzle-door rooms (each door = puzzle) | 7 | 7 | 6 | 6 | 6 | 66 | Puzzle authoring is content-heavy; booth first-timers stall on puzzles instead of dying-and-retrying; horror tension evaporates. |
| E. Cinematic walking sim (no fail state) | 5 | 7 | 5 | 5 | 7 | 57 | No retry loop, no leaderboard, no skill expression — Implementation and Idea axes collapse; it's a screensaver. |
| F. Extraction-lite with loot + meta progression | 8 | 6 | 6 | 7 | 6 | 67 | Meta-progression is a scope bomb; a 5-min booth session can't show a progression economy; demo becomes a menu walkthrough. |

B was the strongest loser (duo play is genuinely better booth bait) — parked as post-hackathon
iteration, mentioned in the video's outro as roadmap, never promised.

## 12. Top 3 risks + concrete mitigations

1. **3D perf on booth hardware** (kill-risk: a 20 fps horror game is a 20 fps demo).
   Mitigation: week-2 perf spike on a low-power laptop BEFORE polish; hard budget (≤3 dynamic
   lights, no shadow maps, merged static geometry, <150 draw calls); low quality preset wired
   from day one; FPS meter in dev builds; QA phase runs the build on the weakest available machine.
2. **Scope creep / art sink** (solo builder, 7 weeks to Jan 12 2027).
   Mitigation: hard caps — 6 archetypes, 4 entities, 24 doors, procedural textures only,
   WebAudio-synth only; greybox milestone (whole run playable with boxes) by end of week 3;
   CUT ladder in §8 is pre-agreed, not negotiated mid-sprint; weekly "cut, don't cram" review.
3. **IP safety** (LSPLASH/Rococo DOORS is litigious-adjacent; hackathon bans third-party marks).
   Mitigation: coined title; original entity names/designs; zero DOORS assets or names;
   `scripts/ip-check.sh` greps repo, comments, and the video script for banned terms and runs
   in CI; manual frame pass over the final video; the reference doors.html is consulted for
   generic door hardware detail only, re-implemented from scratch.

## 13. Demo-video story (<3 min, YouTube-public, running in browser)

0:00 attract screen idles, keypress starts run · 0:15 doors 1–3 calm, one lore card (LLM live,
"flavor only" caption) · 0:40 door 7: lights flicker amber — GAUNT tell — hide in alcove,
survive · 1:10 door 9: CINDER blue flames, sconce relight sequence · 1:35 door 10: MURMUR
backing-away beam walk, then a MISTAKE — death card with epitaph · 1:55 instant checkpoint
retry, door 10 beaten cleanly · 2:20 door 24 finale, run card, leaderboard entry, kiosk idle
reset · 2:40 title card: manifesto line + JetBrains tool chain. Rehearsed to be reproducible:
the schedule is deterministic, so every take is identical.

## 14. If time runs out

Cut in §8 order (gamepad → room variants → LLM lore → TALLY → online leaderboard). The last
acceptable state is a 3-entity, single-variant, canned-text, local-high-score HALLWAKE — still
a complete, coherent, demo-able entry. The first thing to protect is the loop: door → tell →
counterplay → death → retry → leaderboard.
