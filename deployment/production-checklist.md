# HALLWAKE — pre-demo / pre-submission checklist (Phase 10, 2026-11-18)

Statuses below were checked today; items marked ACTION are not yet done and
are for the operator / Phase 12 (submission) to land.

## Gate evidence

- [ ] **JetBrains tool-use evidence — ACTION.** The Cloud9 x JetBrains rubric
      wants visible JetBrains usage. `.idea/` and `.junie/` are **absent from
      the repo today** (verified: `ls -a` at root shows neither). If Junie / a
      JetBrains IDE was used, commit those folders before the submission
      freeze (`git add .idea .junie` — check .gitignore doesn't exclude them)
      so the history shows tool-use. Do this BEFORE Phase 12 packages the repo.
- [x] **ip-check green** — `bash scripts/ip-check.sh` exit 0 today
      ("no banned terms in shipped material"); also runs in CI
      (.github/workflows/ci.yml).
- [x] **Fresh-repo rule** — `git log --all --name-only | grep -c node_modules`
      -> **0**. History is clean of node_modules/dist/.venv; keep it that way
      (they are gitignored).

## Repo completeness (ACTION for Phase 12)

- [ ] **LICENSE — ACTION.** No LICENSE file at repo root today (verified).
      Add one (MIT is the safe hackathon default) so it is detectable by
      judges/scrapers.
- [ ] **Root README.md — ACTION.** No README at repo root today. Add one with
      what HALLWAKE is + the run instructions from deployment/README.md
      (one-command start script + manual steps).
- [ ] Pin backend deps for booth reproducibility (security.md Low finding:
      requirements.txt uses `>=` ranges). Freeze:
      `.venv\Scripts\pip freeze > requirements.lock.txt` on the machine that
      passed QA, and install from the lock at the booth.

## Demo-day run book

- [ ] **Restart the backend before demo.** The long-running uvicorn predates
      the flavor-firewall fix (commit 1675907) — security.md §3 note.
      `.\deployment\start.ps1 -Stop` then `.\deployment\start.ps1`.
- [ ] Contract probes: `/health` shows `llm.online:true` (vLLM reachable from
      the booth machine — it is a **Tailscale IP**, verify `tailscale status`
      on the booth machine); `/api/scores` returns rows; frontend `/` serves.
- [ ] **LLM-down fallback demo** (planned bit): set `HF_LLM_URL` to a dead
      port (or unplug Tailscale), restart backend -> `/health` shows
      `llm.online:false`, `/api/flavor` still 200 with `source:"canned"`,
      game 100% playable. This is a feature, not an error — narrate it.
- [ ] Quality: let auto-detect settle on the booth machine (probes fps, steps
      down below 45 fps); or pin `?quality=mid` once measured.

## Demo video plan (< 3 min, per brief)

1. 0:00-0:15 attract screen (door row 01-24, lantern sweep, live ledger).
2. 0:15-1:45 one continuous run, `?fps=1` meter visible: GAUNT tell->hide
   (door 7), MURMUR beam-hold (door 10), TALLY fake door (door 5 or 12),
   CINDER sconce relight (door 9).
3. 1:45-2:15 one death -> death card epitaph (call out canned-vs-LLM source)
   -> checkpoint respawn.
4. 2:15-2:40 door 24 finale -> run card -> name entry -> leaderboard.
5. 2:40-3:00 LLM-down fallback beat + determinism line ("same schedule every
   run — golden traces in CI").
Keep it under 3:00 hard; record at 1080p60 from the booth machine.
