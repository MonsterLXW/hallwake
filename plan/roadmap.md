# GCRadar — Build roadmap (Phase 5)

Window: **Nov 18 2026 → Jan 12 2027** (7 build weeks + buffer). Solo builder, ~20 h/week
(≈145 h budgeted). Task ids from `plan/tasks.json`. Waves are independence groups — the
orchestrator runs one agent at a time (operator directive), so waves may serialize; the
dependency graph keeps any wave's tasks safely reorderable.

## Wave structure (from deps)

| Wave | Tasks | Why independent |
|---|---|---|
| 1 | T1 (db+seed), T3 (analyzer core), T6 (frontend scaffold+hub/dossier) | disjoint files; T3 is pure/no-DB; T6 is contract-driven off architecture.md §5 with fixtures |
| 2 | T2 (FastAPI core), T7 (matchup+draft UI) | T2 needs T1 schema; T7 needs only the T6 shell — it builds against fixtures from the §5 contract, live integration happens at the orchestrator gate |
| 3 | T4 (API wiring) | joins T1+T2+T3; the integration gate runs all verifies together here |
| 4 | T5 (LLM layer) | replaces T2's llm.py stub and consumes T4 payloads; last because it is narration-only |

## Calendar

### Week 1 — Nov 18–24 (~20 h) — evidence + data + core start
- [1 h] Register JetBrains All Products Pack + AI Ultimate codes NOW (supplies-limited).
- [2 h] GRID access spike → adapter-or-drop decision (never gates the build).
- [1 h] Fresh public repo: LICENSE, commit `.idea/` + `.junie/` from first commit, PyCharm + WebStorm projects created.
- [10 h] **T1** seed curation (weekend task, capped at 10–12 teams — depth over breadth).
- [6 h] **T3** start: golden fixtures hand-computed FIRST, then `draft.py` state machine.
- Checkpoint: `check_seed.py` green; draft replay green on fixtures.

### Week 2 — Nov 25–Dec 1 (~20 h) — deterministic core done
- [12 h] **T3** finish: matrix/roles/ranking + all golden tests green (TDD).
- [8 h] **T2** FastAPI core, catalog, health, static fetch script.
- Checkpoint: analyzer pytest suite green; `TestClient` health 200.

### Week 3 — Dec 2–8 (~20 h) — API + frontend start
- [12 h] **T4** store loader + teams/matchup/draft/comp/weights/matrix endpoints + API tests.
- [8 h] **T6** scaffold, design tokens, chart kit, Hub, Dossier.
- Checkpoint: end-to-end curl of every /api endpoint; Hub+Dossier render against live API.

### Week 4 — Dec 9–15 (~22 h) — the centerpiece
- [14 h] **T7** Draft Board (stateless replay clicks, live scores, reason chains) + Matchup.
- [8 h] **T7** Comp Lab + Explain/Weights panel (the transparency demo beat).
- **CUT LINE A (Dec 15):** if behind, cut LLM Q&A chat from scope now (panels stay offline-styled).
- Checkpoint: full mock draft vs a scouted opponent scores live; weight slider flips a ranking.

### Week 5 — Dec 16–22 (~18 h) — AI layer + integration gate
- [10 h] **T5** llm.py + guard + ai router + MockTransport tests.
- [8 h] Integration pass (orchestrator gate): all 7 tasks' verifies green together; kill the
  backend with a dead LLM URL and prove every screen still fully works (offline-state proof).
- **CUT LINE B (Dec 22):** if behind, drop GRID adapter entirely (already decision-gated W1);
  drop form/trend charts to a simple W/L strip.
- Checkpoint: **MUST-BE-TRUE by Dec 22:** dossiers + matchup + draft analyzer + comp lab +
  offline state all work. Everything after this is polish.

### Week 6 — Dec 23–29 (~16 h) — design + QA (rubric: Design 0.2)
- [8 h] hf-design pass on all 5 screens (original design system, no Riot/team assets anywhere).
- [6 h] Phase 9 QA: full pytest+vitest, browser gate by orchestrator, security pass (no secrets,
  CORS locked to 8402, no hotlinked assets).
- **CUT LINE C (Dec 29):** archetype tags cut; weights UI falls back to read-only confidence.
- Checkpoint: Phase 9 clean; demo script beats all land on real screens.

### Week 7 — Dec 30–Jan 5 (~14 h) — evidence + presentation
- [4 h] JetBrains evidence write-up: Junie sessions on the matrix module, DataGrip on the store,
  IDE depth — methodology narrative doubles as the AI-Workflow-Story bonus entry.
- [6 h] Demo video (<3 min) per idea.md §5 story: record, rehearse, publish public on YouTube.
- [4 h] Deploy prep (Phase 10, operator-approval gate): deterministic core deployable with LLM
  offline; README run instructions verified from a clean clone.

### Buffer — Jan 6–11 (~10 h)
- Submission package (Phase 12): description, deliverable checklist, repo hygiene, video
  public-check, rules re-read (exclusion clauses, bonus entry mechanics).
- Submit Jan 12 before 11:00am PST.

## Cut ladder (fixed order, from idea.md §9)

1. LLM Q&A chat (panels keep offline placeholder) — cut at Line A
2. GRID adapter (never a dependency) — cut at Line B
3. Form/trend charts → W/L strip — cut at Line B
4. Archetype tags — cut at Line C
5. Adjustable-weights UI → read-only confidence display — cut at Line C

**NEVER cut:** analyzer (state machine + matrix + matchup-conditioned ranking), team dossiers,
matchup view, LLM-offline state, committed `.idea/`/`.junie/` evidence, LICENSE + run instructions.

## Standing risks watched weekly

- Seed depth: if W1 curation slips, analyzer is unaffected (data-independent); hub ships with
  10 teams minimum — do not extend into W2.
- Matrix subjectivity: every edge has confidence + note from T1; Explain panel from T7 — both
  are the defense, keep them on the never-cut side of the ladder.
- Demo URL vs unreachable vLLM: offline state is a day-1 property (T2 stub + T6 AiPanel),
  verified at Week 5 gate, not a Week 7 scramble.
