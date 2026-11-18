# Winning idea — binding contract (Phase 4, 2026-11-18)

## GCRadar — Game Changers Scouting Hub & Composition Analyzer

**Category:** 1 — VALORANT / Game Changers tactical scouting, utility placement & operator profiler.
**Thesis:** the Game Changers scene has near-zero public scouting tooling, so build the GC-first
scouting hub: curated team dossiers + a deterministic composition/matchup engine that scores a
draft *against the agent pool of the team you'll actually face* — not a generic tier list.
**Origin:** merged entry — GCRadar (gc-radar, raw 76) shell + CompIQ (comp-iq, raw 74)
composition/matrix module, per the ideas.json graft note. The merge fixes GCRadar's two
weaknesses (tech 6, thin-data dashboard) without touching its 9/9 Impact+Idea axis.
**Final expected score: 80/100** (adversarial, risk-adjusted; raw merged 84). Runner-up:
LineupLab at 74.

## 1. What it is — full concept

A web app (FastAPI + SQLite backend, Vite/React + TS frontend) for GC team staff, amateur
VALORANT players, and analysts:

1. **Team dossiers (GC-first):** every curated GC team gets a page — roster, agent pools with
   per-agent comfort tiers, recent form, event tags. This is the "operator profiler" half of
   the category, pointed at the underserved audience the sponsor itself champions.
2. **Matchup prep:** pick team A vs team B → computed agent-pool overlap, ban-pressure view
   (which agents hurt most if banned/taken), role-coverage gaps, head-to-head matrix summary.
3. **Composition analyzer (tech core, from CompIQ):** a VALORANT pick/ban state machine
   (VCT-style flow, factual rules only) that scores compositions live using a curated
   agent×agent synergy/counter matrix and agent×map matrix — role coverage, synergy graph,
   matchup-adjusted ranking with per-edge confidence and reason chains.
4. **LLM coach layer (local vLLM only):** dossier narratives, "what to watch for" bullets,
   draft rationale prose, Q&A over pre-computed stats. Never computes anything.

**The one ambitious differentiator:** draft *against a scouted opponent*. The analyzer's
counter-pick ranking is conditioned on the opponent team's actual agent pool from the curated
store — "ban X because Cloud9 GC runs it 70% on Ascent and it counters your comp 2:1."
Nobody in this contest will build matchup-conditioned composition scoring, and nobody will
build it for GC specifically.

## 2. Feature split

**MUST (deterministic core — the product must fully work with the LLM down):**
- SQLite curated store: 10–12 GC teams, ~80 players, agent pools with comfort tiers, results,
  event tags. Hand-curated seed dataset (week 1 task, capped — depth over breadth).
- Static agent/map content cached from valorant-api.com (factual text only; NO Riot art,
  no hotlinked assets anywhere in UI or video; original iconography only).
- Team dossier pages with charts (original design system).
- Matchup prep view (overlap, ban pressure, role coverage — all computed).
- Composition analyzer: draft state machine + synergy/counter matrix scoring + ranked
  counter-picks with reasons and per-edge confidence.
- LLM-offline state: every AI feature shows a clear "model offline" placeholder; zero
  deterministic feature degrades.
- JetBrains evidence: build in PyCharm + WebStorm (or IntelliJ IDEA), DataGrip on the SQLite
  layer, Junie agent sessions on the matrix module; commit `.idea/` + `.junie/` folders.

**SHOULD (score lifters, cut in emergency):**
- LLM coach layer: narratives, bullets, draft rationale, JSON-forced Q&A over computed stats.
- "Scouted pattern" archetype tags on compositions (dive/poke/setup) with provenance notes —
  keeps the "tactical scouting" theme explicit.
- Form/trend charts over the curated results.
- GRID ingestion adapter behind a feature flag — an upgrade, never a dependency.
- Adjustable matrix weights UI ("explain this score" transparency panel).

**CUT (do not build — scope fence):**
- User accounts/auth, live match ingestion, account linking, mobile app, VOD/video analysis,
  economy simulator (BuyMath), scenario trainer (ReadTheRound), lineup drills (LineupLab —
  possible v2 module, not v1), multiplayer, anything networked beyond the app itself.

## 3. Deterministic core vs local-LLM firewall

- **Deterministic code owns (exact, testable):** all stat computation, matrix math, draft
  legality and state machine, rankings, charts, data ingestion/caching. Every number on every
  screen comes from this layer.
- **Local LLM owns (never correctness):** prose narration of computed facts — dossier blurbs,
  scouting bullets, draft rationale, Q&A. Input is the deterministic layer's JSON; output is
  forced JSON; prompts kept small for qwen3.8-flash-next.
- **Hard rule:** the LLM never generates a number presented as a stat. One hallucinated stat
  in front of esports-org judges discredits the entry.
- **Demo safety:** judges can't reach the vLLM host; the deployed demo URL runs the full
  deterministic product with LLM features in offline state. Video + repo run instructions are
  primary evidence.

## 4. Data strategy (no official APIs, GRID optional)

- GC team/roster/results facts: hand-curated seed set (public knowledge, entered by hand —
  no scraping, no third-party IP in the repo). Cap: 10–12 teams, fields deep enough to feel
  alive. This is a weekend task scheduled in week 1, not a background risk.
- Agent/map static content: valorant-api.com (community static content API, factual text,
  cached locally at build time).
- Synergy/counter + agent×map matrices: curated from community knowledge, each edge carries
  confidence + source note.
- GRID official esports data: 2h spike decides. If access lands, adapter enriches dossiers/
  form. If not, nothing changes — the analyzer and hub never need it. The merged entry is
  GRID-immune at its core (better than raw GCRadar on this axis).
- Riot IP posture: factual names only; no Riot/Data Dragon art in UI, repo, or video; no team
  logos (trademarks) — text/initials instead; original abstract iconography throughout.

## 5. Demo video story (<3 min, YouTube public)

1. 0:00–0:20 — the gap: "Game Changers is named in this category, and GC teams have almost no
   scouting tooling. GCRadar is built for them first."
2. 0:20–0:50 — team dossier: roster, agent pools, form charts (real clicks, real data).
3. 0:50–1:20 — matchup prep vs Cloud9 GC (sponsor-aligned moment, deliberate): ban-pressure
   and pool-overlap views.
4. 1:20–2:10 — mock draft vs that opponent's scouted pool: analyzer scores the comp live,
   ranked counter-picks with reason chains; flip one matrix weight live to show transparency.
5. 2:10–2:40 — one local-LLM coach line generated from the computed JSON, then toggle
   "model offline" to prove the product still fully works — the local-first story.
6. 2:40–3:00 — JetBrains evidence beat: Junie session on the matrix module, DataGrip on the
   store; repo + methodology write-up close. (Methodology doubles as the AI-Workflow-Story
   bonus entry: local-first privacy-preserving coaching stack on JetBrains + local vLLM.)

## 6. Rubric mapping — final adversarial scores (0.2 each, max 100)

| Criterion | Score | Why it earns it |
|---|---|---|
| Technological Implementation | 8 | Non-trivial deterministic engine (state machine + matrix scoring + matchup conditioning) + DataGrip/Junie/IDE-depth evidence; the graft lifted this from raw GCRadar's 6 |
| Design | 8 | One coherent hub, 5 capped screens, original design system; small-and-finished beats broad-and-half-built |
| Potential Impact | 9 | Named, underserved, sponsor-championed audience (GC scene + Cloud9 GC team); field math: ~80 Cat-1 entries, almost none GC-specific |
| Quality of Idea | 9 | GC-first + matchup-conditioned composition scoring = no direct competitor in field |
| Presentation | 8 | Compact deterministic demo, sponsor-aligned matchup, offline-state proof moment; low fragility (no engine-credibility gamble) |
| **Total** | **84 raw → 80 expected** | Risk discount for curation depth + matrix subjectivity |

## 7. Why each finalist lost (adversarial re-score)

- **ReadTheRound (raw 80 → expected 68):** feasibility 6 moonshot; the resolution engine is
  the product and esports-savvy judges will attack its credibility on sight; if it half-works,
  tech and presentation collapse together; weakest theme fit (trainer vs "scouting"). Highest
  ceiling, worst floor — loses on expected value.
- **LineupLab (76 → 74, runner-up):** safest build, best raw presentation (9), but idea 6 is a
  hard ceiling ("Anki for lineups") and the interactive schematic drill is design-heavy under
  its own design-8 assumption. It has no 9 anywhere; the winner has two. Keep as v2 module idea.
- **Raw GCRadar (76 → 72):** Impact/Idea 9/9 kept, but tech 6 (CRUD+stats) is a Stage Two
  liability and sparse GC data risks a thin-looking dashboard. The merge is literally the fix
  its own ideas.json note prescribed.
- **CompIQ (74 → 72):** no 9 anywhere, known genre, matrix subjectivity unshielded; its best
  module is worth more grafted into the GC shell than standing alone.
- **PatchDelta (72 → 70):** cleanest data story but Cat 2 is the crowded genre; impact story
  broad but not sponsor-heartstringing; idea 7 ceiling.
- **BuyMath (72 → 68):** impact 6 — narrow audience story; value-model credibility attack.

## 8. Top 3 kill-risks + mitigations

1. **GC seed dataset too thin → hub looks empty (Design+Impact collapse).** Mitigation: cap at
   10–12 teams with deep fields; curation is a scheduled week-1 weekend task with a definition
   of done (every team page renders populated charts); analyzer is data-independent so the
   tech core never depends on curation depth.
2. **Matrix subjectivity attacked by esports-literate judges.** Mitigation: per-edge
   confidence + source notes; live-adjustable weights with an "explain this score" panel —
   turn subjectivity into a transparency feature and a demo beat.
3. **Two-module scope creep in 7 weeks.** Mitigation: hub capped at 5 screens; analyzer is
   the centerpiece; weekly cut ladder (cut in order): LLM Q&A chat → GRID adapter →
   form/trend charts → archetype tags. Never cut: analyzer, dossiers, matchup view, offline
   state, JetBrains evidence.
4. (Standing trap) **Demo URL vs unreachable local LLM:** offline-state design from day 1;
   video + repo are primary evidence; deploy deterministic core to a free static+backend host
   at submission time (operator approval gate).

## 9. If time runs out

Cut in this order: (1) LLM Q&A chat, (2) GRID adapter, (3) form/trend charts, (4) archetype
tags, (5) adjustable-weights UI (keep read-only confidence instead). The entry must still
ship: dossiers + matchup view + analyzer + offline state + committed .idea/.junie evidence.
A finished 4-screen hub with a working analyzer outscores a broad half-built trainer.

## 10. Immediate next actions (feed Phases 5–6)

- Register JetBrains All Products Pack + AI Ultimate codes NOW (supplies-limited).
- 2h GRID spike → adapter or drop; decision does not gate the build.
- Fresh public repo, LICENSE file day 1, commit .idea/.junie from first commit.
- Week 1: seed dataset + data model + analyzer skeleton (TDD on matrix math).
