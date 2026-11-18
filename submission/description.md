# HALLWAKE — learn the schedule, or be learned by it

**Category 3: event mini game playable at a Cloud9 booth.**

Booth mini games die in thirty seconds: a passerby tries once, dies to
something random, and walks on — because the game punished luck, not
knowledge. HALLWAKE is the fix. It is a first-person horror corridor game that
runs in the browser: one floor, 24 numbered doors, one lantern, and a fixed
schedule of scares. Four original entities — GAUNT (sweeps the room when the
lights burn amber), MURMUR (only moves in your darkness), TALLY (edits the
doors and spawns a fake one), CINDER (eats your lantern oil) — each fire a
readable tell before they strike. There is no unreadable RNG anywhere: every
run is identical, so dying is a lesson, not a coin flip. Players come back,
beat the door that killed them, and the booth leaderboard (deepest door +
time) rewards knowledge.

The differentiator judges can quote: **the door number itself is an entity.**
TALLY adds a duplicate door — the real one always matches your HUD door log,
the fake never does. Reading the numbers *is* the game.

## How it's built

- **Deterministic core:** a pure TypeScript simulation reducer (zero
  `Math.random`, zero DOM/THREE imports) with golden-trace tests that replay
  hand-authored input sequences and assert identical state. Determinism is
  also the film plan — the demo is reproducible take after take.
- **Rendering:** raw Three.js driven by a fixed-timestep loop. Merged static
  geometry, one lantern spotlight + at most two event lights, zero shadow
  maps, ≤7 draw calls per room — budgets asserted by tests over every door ×
  variant × quality combination. Quality auto-detect probes real fps and
  steps the preset down until it holds 60 fps on booth hardware.
- **Original by construction:** every texture is procedural canvas, every
  sound is WebAudio synthesis, every name is coined. A CI gate
  (`scripts/ip-check.sh`) greps shipped material for banned third-party terms
  and fails the build on any hit.
- **Backend:** FastAPI + stdlib SQLite for the leaderboard (server-validated
  writes) and an LLM flavor proxy. The game is fully playable with the
  backend down (localStorage mirror).
- **The AI story is honest:** a local vLLM on the LAN writes *flavor only* —
  lore cards, death epitaphs, run lines — behind a hard firewall: 0.8-second
  timeout, one request at a time, a busy slot never queues, degrading to 32
  hand-authored canned lines per kind. LLM text is display-only, sanitized
  twice, and never re-enters game state. No paid API anywhere.

**Quality evidence:** 999 frontend tests + 56 backend tests green in CI;
headless autopilot plays all 24 doors with zero deaths at 57 fps with zero
console errors; security audit with zero open Critical/High findings.

## JetBrains tool use

The final implementation pass, refactors and codebase Q&A are done in
JetBrains tools: **WebStorm** for the TypeScript game core and render layer,
**PyCharm** for the FastAPI backend and its pytest suite, **DataGrip** for
inspecting and evolving the SQLite leaderboard schema, and **Junie** (the AI
coding agent) for codebase Q&A and the AI-workflow methodology. The `.idea/`
and `.junie/` folders committed in this repo are that tool-use evidence.
JetBrains Mono is the product's instrument typeface — a nod, with zero
borrowed JetBrains brand assets. (Rider is "recommended" for Category 3, not
required; the rules allow a web stack.)

## The AI-powered workflow story

A solo entrant orchestrated a multi-agent build pipeline (Claude Code driving
the HackathonFactory roster: architect, frontend, backend, QA, security,
presentation) under strict human gates: every phase's artifacts verified on
disk, browser verification centralized at integration points, one agent at a
time. The JetBrains IDEs + Junie are where the human entrant reviews,
refactors and understands the result — the AI builds, the JetBrains tools
verify and own. The methodology is in the repo: `plan/idea.md` (design
contract), `plan/architecture.md`, `qa/report.md`, `qa/security.md`.

## What's next

Parked, not promised: two-player asymmetric co-op (the strongest scoped-out
variant — genuinely better booth bait), a second floor (the schedule is
authored data in one table, so growth is a data change plus budget tests),
and a LAN-wide leaderboard for multi-kiosk events. What we protected above
all is the loop: door → tell → counterplay → death → retry → leaderboard.

## Links

- Repo: _(public URL — operator fills at submission)_
- Live demo: _(URL — operator fills; the deployed build runs canned-flavor
  mode when the LAN LLM is unreachable — the designed fallback)_
- Demo video (<3 min): _(YouTube link — operator fills)_
