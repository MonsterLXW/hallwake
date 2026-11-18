# HALLWAKE — spoken scripts (Phase 11)

All claims below are verified in qa/report.md, qa/security.md, deployment/README.md
and the source. Do not ad-lib numbers beyond these.

---

## A. Two-minute elevator pitch (120 s)

| Time | Beat | Words |
|---|---|---|
| 0:00–0:15 | Hook | "Booth mini games die in thirty seconds. A passerby tries once, dies to something random, and walks on — because the game punished luck, not knowledge. HALLWAKE is the fix: learn the schedule, or be learned by it." |
| 0:15–0:40 | What it is | "It's a first-person horror corridor game that runs in a browser — twenty-four numbered doors, one floor, every run identical. Four original entities: GAUNT walks the room when the lights burn amber; MURMUR only moves in your darkness; TALLY edits the doors and spawns a fake one; CINDER eats your lantern oil. Every scare fires a readable tell first. No unreadable RNG anywhere." |
| 0:40–1:00 | The differentiator | "The ambitious bit: the door number itself is an entity. TALLY adds a duplicate door — the real one matches your HUD door log, the fake never does. Reading the numbers *is* the game. And because the schedule is fixed, dying is a lesson, not a coin flip — so booth players come back and the leaderboard means something." |
| 1:00–1:30 | How it's built | "The game core is a deterministic TypeScript simulation with golden-trace tests — double-run identical, zero Math.random. Three.js renders each room in seven draw calls or fewer, budget enforced by tests. All art is procedural canvas, all sound is WebAudio synthesis — original by construction. A local LLM writes flavor only — lore cards, death epitaphs — behind a firewall: 0.8-second timeout, and the game is one hundred percent playable with it down. No paid API anywhere." |
| 1:30–1:55 | Proof | "Nine hundred ninety-nine frontend tests, fifty-five backend tests, all green. The headless autopilot plays all twenty-four doors with zero deaths at fifty-seven frames per second. An ip-check gate in CI greps the repo for banned third-party terms. Security audit: zero open criticals." |
| 1:55–2:00 | Close | "Small, finished, and built for exactly one job: a Cloud9 booth floor. Learn the schedule — or be learned by it." |

---

## B. Five-minute full pitch (300 s, one pass per slide)

**Slide 1 — Title (0:00–0:25).**
"Hi — this is HALLWAKE. Cloud9 and JetBrains, Category 3: the mini game you'd actually put at a booth. The band across the screen is the whole product: twenty-four doors, and the colors are the schedule. One line: learn the schedule, or be learned by it."

**Slide 2 — Problem (0:25–0:55).**
"Booth mini games fail three ways. They're forgettable — nothing pulls a passerby back. They're unfair — random scares punish everyone equally, and dying to dice reads as broken, not hard. And they're undemoable — every take of the video is a different roll. The sentence on the wall: if the player can't learn, the booth can't win."

**Slide 3 — Answer (0:55–1:25).**
"Our answer is learnable horror. Every scare is scripted to a fixed door and telegraphed with a tell you can read. The corridor is identical every run — survival is knowledge, and the leaderboard rewards knowledge, not dice. The loop is attract, door, tell, counterplay, death, checkpoint retry, run card, leaderboard, back to attract. Six checkpoints, so death costs seconds, never the run. And determinism is also the film plan: the demo video is reproducible take after take."

**Slide 4 — Schedule (1:25–1:55).**
"Here's the design document — the twenty-four-door table itself. TALLY at five, twelve, eighteen. GAUNT at seven, thirteen, nineteen. CINDER at nine, fifteen, twenty-one. MURMUR at ten, sixteen, twenty-two. Checkpoints every fourth door. Safe rooms refill oil and carry lore cards. Door twenty-four is the finale: a CINDER blackout and a GAUNT chase in the same room. This table is authored data — the simulation adds no randomness."

**Slide 5 — Bestiary (1:55–2:35).**
"Four original entities, each tell, mechanic, counterplay. GAUNT: lights flicker twice and burn amber — six-second sweep, hide in the pale-marked alcove, stay still. MURMUR: whispering grows when you face it, and it advances every second it's outside your lantern cone — keep the beam on it; oil management *is* the counterplay. TALLY: chalk marks, the numeral glows red one beat, and a fake door appears — the real one matches your door log, the fake never does. CINDER: flames turn blue, oil drains four times faster, and you relight sconces in the scratch order shown in the room. The differentiator: the door number itself is an entity. Nobody else in this contest builds a horror mini game at all; nobody makes the numbers diegetic."

**Slide 6 — Identity (2:35–3:00).**
"The UI is the night porter's kit: a stenciled door numeral, a ruled door log, a brass oil tube, tell glyphs. The identity rule: bone is information, color is danger — the only saturated hues in the product are the four entity signals. The signal colors are colorblind-validated, and reduced motion crossfades to the same steady tell state, so accessibility never costs fairness."

**Slide 7 — Tech (3:00–3:30).**
"Under the hood: a fixed-timestep TypeScript sim owns movement, door state, entity schedules, oil economy, scoring. Golden-trace tests prove double-run identity and zero Math.random in the core. Three.js, merged rooms, seven draw calls per room, one-hundred-fifty global cap — asserted over every door, variant and quality tier. One lantern light, two event lights max, zero shadow maps. All textures procedural canvas, all audio WebAudio-synthesized — original by construction."

**Slide 8 — LLM firewall (3:30–4:00).**
"The AI story is honest: a local vLLM on the LAN writes flavor only — lore cards, epitaphs, run lines. Hard firewall: 0.8-second timeout, one request at a time, a busy slot never queues — it degrades to thirty-two hand-authored canned lines per kind. LLM text is display-only; it never re-enters game state. The game is fully playable and fully scored with the LLM down. No paid API anywhere — the audit confirms it."

**Slide 9 — IP + booth (4:00–4:20).**
"Original by construction: coined name, procedural art, synthesized sound, and an ip-check script in CI that greps the repo and the video script for banned terms. Booth-ready: one-command start, loopback-only binds, kiosk idle-reset that re-arms on every phase, and quality auto-detect that steps the preset down until it holds sixty frames."

**Slide 10 — Results (4:20–4:40).**
"The numbers: nine-ninety-nine frontend tests, fifty-five backend tests, all green. Autopilot plays twenty-four of twenty-four doors, zero deaths, fifty-seven fps steady, zero console errors. Security: zero open criticals or highs. Two hundred twenty-one kilobytes gzipped — a kiosk loads it instantly."

**Slide 11 — Rubric (4:40–4:55).**
"Against the five criteria: a non-trivial working implementation with real tool depth; one coherent loop, small and finished; impact aimed at the category's own use case — booth floors; an idea you can quote — learnable horror, doors as entity; and a presentation that films itself because the events are scripted."

**Slide 12 — Ask (4:55–5:00).**
"So: put HALLWAKE on the Cloud9 booth floor. It's running right now. Learn the schedule — or be learned by it."

---

## C. Demo-video walkthrough (<3 min, shot-by-shot, matches what actually runs)

Target: `http://localhost:8402` (or the booth URL). One continuous capture if
possible; cuts are fine. The schedule is deterministic — every take is identical,
so re-shoot any single shot without re-recording the run.

| Time | Shot | What happens on screen | What you say |
|---|---|---|---|
| 0:00–0:12 | Attract screen | Door row 01–24, lantern glow sweeping, PRESS ANY KEY breathing | "This is the kiosk attract loop. The door row is the brand — and the schedule." |
| 0:12–0:25 | Press a key → spawn | Door 01 numeral bottom-right, door log top-left, oil tube bottom-left full, lantern in hand | "Any key starts the run. The lantern is in hand from door one — the oil tube is the whole resource economy." |
| 0:25–0:40 | Doors 1–4 | Walk through calm rooms; caption: "LLM lore card — flavor only" on door 3's card | "Doors one to four are safe rooms. That lore card is the local LLM — flavor only, never game state." |
| 0:40–1:00 | Door 5 — TALLY | Chalk marks on frame, numeral glows red one beat, fake door with wrong number appears; open the door whose number matches the HUD log | "Door five: TALLY edits the doors. The fake door's number never matches the door log. Reading the numbers is the counterplay." |
| 1:00–1:25 | Door 7 — GAUNT | Lights flicker twice, burn amber, door slams; step into the pale-marked alcove, hold still, amber fades | "Door seven: the amber tell means GAUNT is sweeping. Alcove, stillness, survive. Watch it once — beat it every time." |
| 1:25–1:50 | Door 9 — CINDER | Flames turn blue, hiss, oil gauge drops visibly; sconces go dark; relight in scratch order; oil restored | "Door nine: CINDER eats light — oil drains four times faster. Relight the sconces in the scratch order and it banishes." |
| 1:50–2:15 | Door 24 — finale | CINDER blackout + GAUNT tell mid-room; survive the chase, open the last door | "Door twenty-four: both at once — the blackout and the chase in one room. This is what the fixed schedule builds toward." |
| 2:15–2:35 | Run card → leaderboard | Run card (deepest door, time, deaths) → name entry → leaderboard ledger | "Run card, name on the local leaderboard — deepest door and time. Knowledge, not dice." |
| 2:35–2:50 | Idle → attract | Walk away; after 30 s the attract screen returns | "Thirty seconds idle and the kiosk resets itself. It's ready for the next passerby." |
| 2:50–3:00 | Title card | HALLWAKE masthead + "learn the schedule or be learned by it" + JetBrains toolchain line | "HALLWAKE. Built in WebStorm, PyCharm, DataGrip and Junie. Learn the schedule — or be learned by it." |

Optional insert (if the cut has room, swap into the door 9–24 gap): door 10
MURMUR — whisper + beam sputter, one mistake, death card with epitaph, instant
checkpoint retry, clean second attempt. It sells the death→retry→mastery arc.

Caption requirements: label the LLM moment ("flavor only — game runs with LLM
down") and the determinism moment ("same schedule, every run"). No third-party
music or assets — use the game's own WebAudio for the soundtrack.
