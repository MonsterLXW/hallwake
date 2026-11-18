# Opportunity analysis — Cloud9 x JetBrains "Sky's The Limit" 2026
Phase 2 (strategy) · 2026-11-18 · solo builder, local vLLM only (qwen3.8-flash-next), Python/TS/Rust stack

## 1. Rubric read — what the scoring actually rewards
Stage One is pass/fail: theme fit + "reasonable application" of a JetBrains tool. That is a floor, not a score — any genuine IDE-based build with committed evidence clears it. All real differentiation happens in Stage Two's five 0.2 criteria, which are genuinely equal (no criterion is weighted heavier), so a balanced entry beats a lopsided one:

- **Technological Implementation (0.2)** — two things bundled: (a) thoroughness/skill of JetBrains tool use, (b) a working non-trivial implementation. Tool *depth* is scored here, not just gated: Junie agent sessions, `.junie` config, DataGrip on the SQLite layer, live templates/inspection profiles in PyCharm/WebStorm. Show tool usage in the methodology write-up, not only in the repo.
- **Design (0.2)** — "complete coherent product experience": a small, finished, visually consistent surface beats a broad half-built one. Budget for a design pass (Phase 6 hf-design) as if it were a feature.
- **Potential Impact (0.2)** — "credible case for a real audience": naming a specific underserved audience with evidence outscores generic "gamers" claims. This is where the category choice itself earns points.
- **Quality of the Idea (0.2)** — creativity/novelty of the *angle*, not tech flash. Crowded genres (LoL draft builders) start with a novelty handicap.
- **Presentation (0.2)** — the <3-min video showing the project actually running end-to-end. Tight script, real clicks, no mockups; a dead demo URL at judging time lands here.

Effort mapping: every criterion is 0.2, so the cheapest points are Presentation (script + rehearse, ~2h) and Impact (audience framing, ~1h); the most effort-hungry are Implementation (real features + tool depth) and Design. Do not over-invest in the LLM layer — it is not its own criterion.

## 2. Category decision — RECOMMEND Category 1 (VALORANT / Game Changers tactical scouting)
| Factor | Cat 1 VALORANT scouting | Cat 2 LoL macro/draft | Cat 3 booth mini game |
|---|---|---|---|
| Data availability | GRID official esports data (sponsor-sanctioned, optional) + valorant-api.com static content + curated lineup library; no official Riot game API (retired 2022) | Best: official Riot LoL API + Data Dragon, free, stable schemas | N/A (no data needed) |
| Riot IP exposure | Medium: data/factual use OK; must not embed Riot art in UI | Medium: same, plus API ToS non-commercial compliance | Highest: "no recreating Riot content," original art mandatory — asset burden |
| Novelty headroom | High — "Game Changers" is named in the category and is genuinely underserved; Cloud9 fields a GC team (sponsor-aligned) | Low — draft managers/scouting dashboards are a solved genre | Medium — but game-jam space is crowded with hobby entries |
| LLM fit (local) | Strong: operator profiler narratives, utility-lineup coach, Q&A over computed stats | Strong: draft rationale, scouting prose | Weak: LLM in a mini game is usually gimmick |
| Demo in <3 min | Easy: dashboard + one live "ask the coach" moment | Easy: draft board walkthrough | Needs gameplay footage + original art first |
| Stack fit | Web app (FastAPI + TS) — exact fit | Web app — exact fit | Rider recommended → C#/Unity/Godot — stack mismatch + art cost |
| Judging risk | Data provenance questions if GRID access fails | Genre fatigue caps the 0.2 novelty score | "Potential Impact" is hardest to argue for a booth toy |

**Why Cat 1:** the Game Changers angle wins the two softest-to-earn criteria (Impact: a real, named, underserved audience that the sponsor itself champions; Novelty: almost nobody will build for GC specifically), the LLM has a genuine non-decorative job, the demo is compact, and the stack fits. Data risk is the real cost — mitigated because GRID is the sponsor's own official esports data feed (VCT is a GRID-covered league) and static agent/map content is available from community APIs; a curated pro-lineup dataset is buildable by hand in hours if needed.

**Fallback trigger (decide in a 2h spike before Phase 3 locks):** if GRID access requires an approval process that won't resolve in time AND community pro-match data proves unusable, fall back to Cat 2 — its Riot API path is fully sanctioned and key-free-risk; accept the novelty handicap by picking an un-crowded sub-angle there (e.g., amateur/coach-first, local-first privacy).

**Cat 3 is out:** Rider-recommended means C# game tooling (stack mismatch), original-assets-only means art production time, and Impact is the weakest story of the three.

## 3. Trap zones — rules that kill entries
1. **JetBrains evidence:** the repo MUST contain a committed `.idea`/`.junie`/`.air` folder; missing = Stage One fail. Do the real build inside JetBrains tools (register NOW for the free All Products Pack + AI Ultimate codes — "while supplies last").
2. **Riot IP:** no recreating Riot content; games need original names/art. For a scouting tool, factual names are fine, but do NOT hotlink Riot/Data Dragon art into the UI or video; use original iconography or clearly-licensed community assets, and no third-party trademarks or copyrighted music in the video.
3. **Demo URL:** a working web URL (or judge-accessible build + install instructions) is required. The local vLLM at 100.124.134.63 is unreachable from judges' networks and trycloudflare tunnels are ephemeral — the app MUST degrade gracefully (deterministic features fully work with LLM down; LLM features show a clear offline state), and the video + repo instructions are the primary evidence.
4. **Pre-existing code:** project must be new or significantly UX-updated after 2026-11-17. Cleanest path: start a fresh repo; if anything is reused, commit history must show substantial post-Nov-17 UX-changing work.
5. **Video:** <3 min, publicly visible on YouTube, shows the project running on its target device. Unlisted is risky ("publicly visible") — publish unlisted→public check before submission.
6. **Repo hygiene:** public repo with a *detectable* license (add LICENSE file, not just README mention) and full run instructions.
7. **Eligibility gaps:** verify operator country vs excluded list; re-read full rules for a sponsor-employee exclusion clause.

## 4. LLM firewall — where local inference earns points vs where it must not touch the result
- **LLM owns (scored as creativity/impact, never as correctness):** scouting-report prose, operator-profile narratives, "why this lineup works" explanations, natural-language Q&A over pre-computed stats, coach-tone summaries. Feed it structured JSON from the deterministic layer; force JSON output; keep prompts small for the local model.
- **Deterministic code owns (must be exact):** all stat computation, win/matchup math, draft or agent-pick state machines, map/utility geometry and coordinates, data ingestion/caching, anything shown as a number or on a map. The LLM narrates computed facts; it never computes them. This also de-risks the demo (LLM down → product still works) and hides local-model latency behind pre-computation.
- **Never:** cloud API fallbacks (constraint), LLM-generated numbers presented as stats (judges are esports-org people; one hallucinated stat discredits the whole entry).

## 5. Gaps to close before submission (from brief gaps[] + new)
1. Bonus "Best AI-Powered Workflow Story" amount and entry mechanics — re-fetch full rules page (curl worked where WebFetch 403'd). The methodology write-up doubles as this story: local-first, privacy-preserving coaching stack on JetBrains + local vLLM — write it as a narrative, not a changelog.
2. Sponsor-employee/affiliation exclusion — re-read full rules text.
3. Operator country of residence vs excluded-territory list — confirm.
4. NEW: GRID data access process (key? application? sponsor code?) — 2h spike decides Cat 1 vs Cat 2 fallback.
5. NEW: register for JetBrains All Products Pack / AI Ultimate codes immediately (supplies-limited).
6. NEW: confirm whether judge-accessible build is accepted as the sole demo path in case a stable URL can't be kept up until Jan 12.

## 6. Field math
245 entrants across 3 categories ≈ 80/category before dropouts (hackathon completion rates mean ~half will submit something real). A polished, coherent, well-presented Cat 1 entry with a named audience is plausibly top-3 in its category on effort alone; the $6k + GDC prize is winnable, and the runner-up $2k tier multiplies the value of picking the least-crowded category.
