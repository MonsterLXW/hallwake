# Ideas — Cloud9 x JetBrains "Sky's The Limit" (Phase 3)

Solo builder, ~7 weeks, local vLLM only (qwen3.8-flash-next), Vite/React + FastAPI, no Riot assets, JetBrains tool use = pass/fail gate.
Scores: 5 rubric criteria x 0.2 each; weighted_total = 0.2 x sum (max 100). Feas = solo build feasibility, Orig = originality (advisory, 0-10).
Data risk graded vs GRID access unknown: none / minimal / medium / high. Sorted by weighted_total desc. 16 ideas: 11 Cat 1, 3 Cat 2, 2 Cat 3, tiers mixed.

| # | Id | Title | Cat | Tier | Tech | Design | Impact | Idea | Pres | Total | Feas | Orig | Data risk |
|---|----|-------|-----|------|------|--------|--------|------|------|-------|------|------|-----------|
| 1 | read-the-round | ReadTheRound | 1 | moonshot | 9 | 7 | 7 | 9 | 8 | **80** | 6 | 9 | none |
| 2 | lineup-lab | LineupLab | 1 | strong | 7 | 8 | 8 | 6 | 9 | **76** | 8 | 7 | none |
| 3 | gc-radar | GCRadar | 1 | strong | 6 | 7 | 9 | 9 | 7 | **76** | 8 | 9 | medium |
| 4 | comp-iq | CompIQ | 1 | strong | 8 | 7 | 7 | 7 | 8 | **74** | 8 | 7 | none |
| 5 | patch-delta | PatchDelta | 2 | strong | 7 | 7 | 7 | 7 | 8 | **72** | 9 | 7 | minimal |
| 6 | buymath | BuyMath | 1 | strong | 8 | 7 | 6 | 8 | 7 | **72** | 8 | 8 | none |
| 7 | mirror-profile | Mirror | 1 | strong | 7 | 7 | 7 | 7 | 7 | **70** | 8 | 8 | none |
| 8 | scout-pilot | ScoutPilot | 1 | safe | 7 | 7 | 7 | 6 | 8 | **70** | 8 | 6 | high |
| 9 | macro-log | MacroLog | 2 | safe | 8 | 7 | 7 | 5 | 8 | **70** | 8 | 5 | minimal |
| 10 | setup-board | SetupBoard | 1 | moonshot | 6 | 8 | 6 | 6 | 8 | **68** | 7 | 7 | none |
| 11 | meta-pulse | MetaPulse | 1 | moonshot | 7 | 7 | 6 | 6 | 7 | **66** | 6 | 6 | high |
| 12 | draft-rush | DraftRush | 3 | safe | 6 | 7 | 5 | 6 | 8 | **64** | 7 | 6 | none |
| 13 | counter-pick | CounterPick | 1 | safe | 6 | 7 | 6 | 5 | 8 | **64** | 9 | 5 | none |
| 14 | draft-room | DraftRoom | 2 | safe | 7 | 7 | 6 | 4 | 8 | **64** | 9 | 4 | minimal |
| 15 | scrim-sync | ScrimSync | 1 | safe | 6 | 6 | 7 | 6 | 6 | **62** | 8 | 6 | none |
| 16 | nerve-grid | NerveGrid | 3 | safe | 5 | 6 | 4 | 4 | 8 | **54** | 9 | 4 | none |

## 1. ReadTheRound (80) — Cat 1, moonshot
Rule-based tactical decision trainer: procedurally assembled round scenarios (numbers, economy, utility, abstract site zones) drawn from a curated bank of scouted pro-round patterns; a deterministic, transparent engine resolves and scores the trainee's calls.
- LLM firewall: engine owns all state/resolution/scoring; LLM writes only the post-round debrief from resolution JSON.
- Risks: resolution-model credibility with esports-savvy judges; scope must be capped (~40 scenarios); frame as scouting-derived to stay on the "scouting" theme.

## 2. LineupLab (76) — Cat 1, strong
Utility lineup library + spaced-repetition trainer: curated per-map/per-agent lineups as interactive step drills on original abstract schematics; deterministic quiz scoring + SRS decides what you review next.
- LLM firewall: correctness/SRS/geometry deterministic; LLM writes "why this works" cards and feedback.
- Risks: lineup content exists as videos — the SRS trainer is the novelty and must lead the demo; schematics must be original abstractions.

## 3. GCRadar (76) — Cat 1, strong
Game Changers-first scouting hub: team dossiers, agent-pool analysis, matchup prep on a hand-curated dataset; GRID is an upgrade, never a dependency.
- LLM firewall: stats/filters/matchups computed; LLM writes dossier narratives.
- Risks: plainest tech of the top tier (needs a synergy or prep-report module to lift tech score); sparse GC data can look thin without deep curation. Highest Impact+Idea in the set — the opportunity.md audience play.

## 4. CompIQ (74) — Cat 1, strong
Pick/ban + composition analyzer: deterministic draft state machine plus curated role-coverage/synergy/counter matrix scores comps live and ranks counter-picks with reasons.
- LLM firewall: draft legality + matrix math deterministic; LLM narrates rationale.
- Risks: subjective matrix needs per-edge sourcing/confidence; known genre but less crowded than LoL drafts.

## 5. PatchDelta (72) — Cat 2, strong
Patch-delta impact analyzer: diff Data Dragon across versions, cluster + score every change deterministically, rank patch impact, LLM writes a coach-readable patch brief.
- LLM firewall: diff/score pure deterministic over versioned JSON; LLM only phrases the brief.
- Risks: Cat 2 is crowded, but diff-first is a fresher sub-angle; impact story broad but less sponsor-heartstringing than GC.

## 6. BuyMath (72) — Cat 1, strong
Economy x utility value simulator: deterministic engine enumerates every affordable collective buy for the round state and scores what each buy buys you (coverage, rifle odds).
- LLM firewall: combinatorial enumeration + scoring exact; LLM explains the call in callout language.
- Risks: value-model credibility — keep scoring transparent/adjustable; narrower impact.

## 7. Mirror (70) — Cat 1, strong
Local-first self-scouting profiler: fast match-log entry, deterministic playstyle profile (aggression, utility usage, trends), LLM coach narrative; data never leaves the machine.
- LLM firewall: indices/trends computed; LLM narrates only.
- Risks: manual-entry friction (seed demo profile, show <60s entry); harder to make flashy in 3 min.

## 8. ScoutPilot (70) — Cat 1, safe
Opponent prep report generator: deterministic stat computation over curated pro-match data -> structured facts -> local LLM assembles a full scouting report.
- LLM firewall: every number from deterministic aggregation; LLM orders/phrases JSON facts.
- Risks: highest GRID dependency in the Cat 1 set; "AI writes a report" is the most common hackathon pitch — novelty capped.

## 9. MacroLog (70) — Cat 2, safe
Amateur LoL macro coach via official Riot match/timeline API: deterministic macro metrics vs your baseline, local-LLM debrief, private by design.
- LLM firewall: metrics from timeline JSON exact; LLM writes debrief.
- Risks: op.gg adjacency caps novelty; the local-first privacy/coach angle must be said out loud.

## 10. SetupBoard (68) — Cat 1, moonshot
Coach's setup authoring tool: original-geometry site board with keyframed timelines, shareable setup library, LLM derives practice drills from saved setups.
- LLM firewall: board/timeline/export deterministic; LLM makes drills + notes.
- Risks: canvas editor is design-heavy, easy to under-polish solo; coach-only audience.

## 11. MetaPulse (66) — Cat 1, moonshot
Patch-to-pro meta shift tracker: multi-patch pick/ban snapshots, deterministic trend math flags shifts, LLM writes the meta narrative.
- LLM firewall: trend math exact; LLM narrates computed deltas.
- Risks: data curation IS the product; highest GRID dependency; interactive shift-flagging is the only new bit.

## 12. DraftRush (64) — Cat 3, safe
Booth game, fully original IP: 60s roster-draft duel vs heuristic AI over abstract geometric original characters; LLM as hype announcer; leaderboard.
- LLM firewall: rules/AI opponent/scoring deterministic; announcer lines are flavor; canned lines if LLM down.
- Risks: original-art rule = asset burden (abstract style keeps it solo-feasible); weakest impact story by category.

## 13. CounterPick (64) — Cat 1, safe
Operator counter-pick advisor: curated matchup matrix, ranked counters with per-pair confidence.
- Risks: known genre, weakest novelty; overlaps CompIQ — never build both.

## 14. DraftRoom (64) — Cat 2, safe
Coach-first LoL draft assistant, local-first, no account linking.
- Risks: most crowded sub-genre in the contest (explicit novelty handicap); pure fallback if Cat 1 spikes fail.

## 15. ScrimSync (62) — Cat 1, safe
Post-scrim review: fast structured round-event entry, deterministic round-win factor aggregation, LLM writes the team review.
- Risks: data-entry-heavy demo is slow; needs seeded multi-scrim data to show insight.

## 16. NerveGrid (54) — Cat 3, safe
Booth reflex/decision game, original geometric visuals, deterministic scoring, LLM flavor.
- Risks: default hobby-entry genre, weakest novelty; kept as the low-effort Cat 3 floor.

## Cross-cutting notes
- Every idea works fully with the LLM down (deterministic core owns results; LLM narrates/annotates) — required by the demo-URL-vs-local-LLM trap in opportunity.md.
- All UIs must use original iconography/abstract schematics; factual agent/map names only; no hotlinked Riot/Data Dragon art in UI or video.
- Cat 1 ideas with data risk "none" (1,2,4,6,7,10,13,15) survive a total GRID failure — the GRID 2h spike only gates ideas 3, 8, 11.
- Strongest rubric fit: ReadTheRound/LineupLab/CompIQ win Implementation+Presentation cheaply; GCRadar is the Impact+Novelty play per opportunity.md and pairs naturally with LineupLab content if merged later.
