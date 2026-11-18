# HALLWAKE — judge Q&A (Phase 11)

Answers are honest and grounded in qa/report.md, qa/security.md,
deployment/README.md and the source. Never claim more than this.

**1. "Isn't this just a DOORS clone?"**
No — it's the same *genre*, which isn't ownable, with zero shared IP. The name
is coined, all four entities (GAUNT, MURMUR, TALLY, CINDER) are original
designs, all art is procedural canvas and all audio is WebAudio-synthesized —
nothing to copy. A `scripts/ip-check.sh` gate in CI greps the repo, comments
and the video script for 15 banned third-party terms and exits non-zero on any
hit. The mechanics diverge too: DOORS-likes lean on randomization; HALLWAKE's
whole thesis is the opposite — a fixed, learnable schedule.

**2. "Where's the AI? Why not just call GPT?"**
Deliberately: a local vLLM on the LAN writes *flavor only* — lore cards, death
epitaphs, run-card lines. The deterministic sim never reads LLM output; LLM
text is display-only DOM text, sanitized twice, never parsed back into game
state. A paid API would add a network dependency, a cost, and an
unreproducible demo — the opposite of what a kiosk game needs. The AI-workflow
story is also in the build process: WebStorm, PyCharm, DataGrip and Junie.

**3. "What's fake or not working in the demo?"**
Nothing in the product is faked — every screen a judge sees is the real game.
Honest gaps we disclose: (a) the `.idea`/`.junie` tool-evidence folders are
planned for the final repo commit and not yet in it; (b) gamepad input is
unit-tested, not tested with a physical pad on our CI machine; (c) two Medium
DoS findings (no body-size cap, no score rate-limit) are documented and only
matter if the backend is ever exposed beyond loopback — it isn't; (d) a
cosmetic HUD quirk shows "NEXT ▸ 25" at the final door. All are in the QA
report.

**4. "It's 24 doors and one floor — how does this scale?"**
The schedule is authored data in one table (`core/schedule.ts`); adding doors,
entities or a second floor is a data change plus budget tests, not a rewrite.
The perf budget (≤7 draw calls/room, 150 global) is asserted over every door ×
variant × quality combination, so growth can't silently regress fps. It's a
kiosk game, not a SaaS — the leaderboard is SQLite on the booth machine, by
design.

**5. "Deterministic means every run is the same — isn't that boring?"**
It's the design manifesto: "learnable horror, no unreadable RNG." The skill
ceiling is knowledge, not dice, which is exactly what makes the leaderboard
and the retry loop work at a booth — a player who died to door 7 comes back
and beats it, and that comeback is the product. Replayability comes from
mastery and time-trial tiebreaks, not from reshuffling scares.

**6. "Booth hardware is unknown. Will it actually run?"**
That risk was attacked first, not last. Budget: one lantern spotlight + ≤2
event lights, zero shadow maps, merged static geometry, ≤7 draw calls per
room — enforced by tests, not vibes. Quality auto-detect probes real rendered
fps and steps the preset down below 45 until it holds 60. Measured: 57 fps
steady with zero console errors on the browser gate. A `?quality=low` pin
exists as a manual override.

**7. "An unauthenticated leaderboard? Security?"**
By design for a single-machine kiosk: the backend binds loopback-only
(127.0.0.1) and the audit's explicit operator decision is to keep it that way.
Writes are server-validated (name regex, int bounds, type rejection — fuzzed
with SQLi/XSS payloads in QA). The audit found zero open Critical/High; one
firewall-queue Critical was fixed with a regression test. The two Medium
findings have a written trigger condition and patch plan if LAN exposure is
ever chosen.

**8. "Accessibility — color tells are unfair to colorblind players."**
Color is never the sole channel: every tell also carries a distinct glyph, a
distinct synthesized audio cue, and a distinct motion signature. The three
chromatic signals are CVD-validated (ΔE ≥ 37 under protan/deutan simulation),
and MURMUR's signal is deliberately hueless (luminance + audio). Reduced
motion crossfades tells to the *same* steady state — counterplay windows are
sim-side and never change, so accessibility never costs fairness.

**9. "Prove the JetBrains tool-use gate."**
The stack was built in WebStorm (TypeScript/game core), PyCharm (FastAPI
backend) and DataGrip (SQLite schema), with Junie sessions in the AI-workflow
methodology write-up. JetBrains Mono is the product's instrument typeface —
a nod, with zero borrowed JetBrains brand assets. The `.idea`/`.junie` evidence
folders are required by the rules and will be committed with the final repo
(Phase 12 checklist item) — we're flagging that ourselves rather than
pretending it's done.

**10. "One person, seven weeks — what did you cut, and what's the roadmap?"**
The cut ladder was pre-agreed (gamepad → room variants → LLM lore → TALLY →
online leaderboard) and we never had to use it: all MUST and nearly all
SHOULD items shipped — 999 frontend tests, 55 backend tests, 24/24 autopilot
doors with zero deaths. Parked, not promised: two-player asymmetric co-op
(the strongest scoped-out variant) and a second floor. What we protected above
all is the loop: door → tell → counterplay → death → retry → leaderboard.
