# HALLWAKE — deliverables compliance checklist (Phase 12, 2026-11-18)

Every requirement from `research/brief.json` -> where it is satisfied ->
status. **Stage One pass/fail items are rows 1-3** — the entry is rejected
before judging if any of them fails.

Status legend: **DONE** = satisfied in this repo, verified today.
**NEEDS-HUMAN** = only the operator (human entrant) can do it — recording,
publishing, account actions. Nothing in this table was faked.

| # | Requirement (brief.json) | Where satisfied | Status | How / action needed |
|---|---|---|---|---|
| 1 | Enter one category; theme fit (Stage One pass/fail) — Category 3: event mini game playable at a Cloud9 booth | Whole product: kiosk attract/idle-reset, 3-5 min sessions, checkpoints, local leaderboard (`plan/idea.md` §2-3, `deployment/booth.md`); category stated in `submission/description.md` | DONE | Operator selects Category 3 on the Devpost entry form. |
| 2 | Build or significantly update using at least one JetBrains tool — reasonable application (Stage One pass/fail) | NOT YET — the code was built with a different toolchain; no JetBrains session artifacts exist | **NEEDS-HUMAN** | Operator: get the free All Products Pack + AI Ultimate code from the competition page (supplies-limited — register early), open this project in WebStorm (and PyCharm for `app/backend`), do a genuine review/refactor/Q&A pass, run at least one **Junie** task, then commit `.idea/` + `.junie/` (row 3). The description's tool-use section is only true after this pass — do it before submitting. |
| 3 | Commit `.idea` / `.junie` / `.air` folder as tool-use evidence | Absent today (verified `ls -a` at root; `deployment/production-checklist.md` flags it). `.gitignore` deliberately does NOT exclude them | **NEEDS-HUMAN** | After row 2: `git add .idea .junie && git commit -m "chore: JetBrains tool-use evidence"`. Do not hand-create these folders — they must come from a real IDE session. |
| 4 | Public open-source repo (GitHub/GitLab/Bitbucket) | Local repo complete and clean (branch `master`, no remote configured; agents never push) | **NEEDS-HUMAN** | Operator creates the public remote and pushes: `git remote add origin <url> && git push -u origin master`. Review `submission/hygiene.md` first (state.json untracked; history note). |
| 5 | Detectable license | `LICENSE` at repo root — MIT, (c) 2026 HALLWAKE contributors; README License section; font licenses (SIL OFL) bundled in `app/frontend/public/fonts/` | DONE | — |
| 6 | All source, assets, run instructions in the repo | `app/` (all source; art/audio are procedural code, fonts bundled), root `README.md` quick start, full verified recipe `deployment/README.md` + `start.ps1`/`start.sh` | DONE | — |
| 7 | Project new (or significantly updated after Nov 17, 2026) | First commit 2026-11-18; entire history post-dates the submission-period start | DONE | — |
| 8 | Text description explaining features and demonstrating JetBrains tool use | `submission/description.md` (Devpost-ready) | DONE | Tool-use paragraphs become truthful only after row 2's pass — operator confirms before pasting. |
| 9 | Working demo URL (web) or judge-accessible build + install instructions | Build + instructions: DONE (root README + `deployment/`). Demo URL: not hosted | **NEEDS-HUMAN** | Operator picks a static host for `app/frontend/dist` (the built bundle is 221 kB gzipped). Without the LAN vLLM the deployed demo runs canned-flavor mode — that is the designed fallback, fine for judges. Leaderboard needs the backend, so either also host `app/backend` (apply `deployment/booth.md` Patches A+B first) or ship the local build as the judge-accessible path. |
| 10 | Demo video < 3 min, publicly visible on YouTube, showing the project running on its target device | Script ready: `submission/video-script.md` (2:58 shot list, deterministic schedule = identical takes) | **NEEDS-HUMAN** | Operator records at 1080p60 from the booth machine's browser (target device), uploads to YouTube as Public, pastes the link in the entry. No third-party music — the game's own WebAudio is the soundtrack. |
| 11 | Methodology write-up (approach + how the tool solves the category problem) | `plan/idea.md` (design contract), `plan/architecture.md`, `plan/roadmap.md`, `qa/report.md`, `qa/security.md`, `submission/description.md` §Methodology | DONE | Operator folds in 2-3 sentences about the actual JetBrains/Junie pass from row 2 (what Junie did, what was reviewed in WebStorm) — makes rows 2/8 airtight. |
| 12 | All materials in English | All repo docs, UI strings, scripts: English | DONE | — |
| 13 | Original work, solely owned; original names/artwork/assets (Riot-policy + no third-party marks) | Coined IP (HALLWAKE + 4 entities), procedural art + synthesized audio, `scripts/ip-check.sh` (15 banned terms) green locally + in CI (`production-checklist.md` fresh-repo check: 0 node_modules/dist/.venv ever committed) | DONE | Operator attests sole ownership on the entry form. |
| 14 | GRID official esports data — optional for every category | Not used (allowed) | DONE | — |
| 15 | Submit on Devpost before **Jan 12, 2027 11:00am PST**; eligibility (age of majority; not resident of excluded regions) | Materials staged; deadline tracked in `plan/roadmap.md` | **NEEDS-HUMAN** | Operator verifies eligibility and clicks Submit. Target well before the freeze; the JetBrains pass (row 2) is the long pole. |

## Score

- **DONE: 9** (rows 1, 5, 6, 7, 8, 11, 12, 13, 14)
- **NEEDS-HUMAN: 6** (rows 2, 3, 4, 9, 10, 15)

## Verified evidence tails (2026-11-18)

```
$ bash scripts/ip-check.sh --selftest
ip-check: selftest 1/2 OK - planted violation detected
ip-check: selftest 2/2 OK - repo clean (15 banned terms)
ip-check exit: 0

$ npx vitest run            (app/frontend)
 Test Files  13 passed (13)
      Tests  999 passed (999)

$ .venv\Scripts\python.exe -m pytest -q   (app/backend)
56 passed, 1 skipped, 1 warning in 1.36s
```
