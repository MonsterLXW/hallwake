# HALLWAKE Phase 9 QA report (headless, 2026-11-18, hf-qa)

Stack reused: backend 8401, preview 8402 (IPv6 ::1 bind — use `localhost:8402`). No browser per directive; orchestrator owns browser checks.

## Suites
- Before: vitest 990/990, pytest 55 passed +1 skipped, ip-check exit 0 + selftest OK
- After fixes: vitest **999/999** (13 files), build clean, ip-check exit 0

## API probes (curl, live 8401) — all PASS
- health llm online; scores limit clamp (0→1, -5→clamped, abc→422, no 5xx)
- POST rejects `<script>`/SQLi/13-char/unicode names, `deepest_door:true`, `10.5`, malformed JSON, 100KB name — all 422 with exact §10 messages; extra keys ignored → 201; rank door-DESC verified
- flavor: bogus kind / door 0/25 / deaths 100 → 422; entity `<script>` whitelisted → 200 clean prompt; valid lore/epitaph/run → 200 live-LLM; never 5xx
- CORS echoes 8402 origins only; evil origin gets no ACAO
- 8402 serves new bundle + proxy + favicon 200

## MUST-list review — PASS
pointer-lock FPS; schedule == §4 table verbatim; 4 FSMs match §5 constants; oil economy exact (1/5400/tick, ×4, 0.35/0.6/0.6, radius 2+6·oil); checkpoint retry; HUD; procedural art + WebAudio; determinism (trace double-run, seed-ignored tests, no-Math.random scan); LLM-down playability (32 canned/kind both sides, textContent-only); ip-check coverage proven by planted probe (exit 1 → removed → 0). 5-screen cap: 5 phases; name/board are run-card stages — within cap.

## Bugs fixed (smallest patch + regression test each)
1. `b685b66` kiosk idle timer cleared on every setPhase, never re-armed — die/finish + walk away = booth stuck off-attract. Now armed on every non-attract phase entry (5 fake-timer tests)
2. `a86152c` gamepad-only players never marked activity → attract reset mid-run. loop.ts fires onActivity per non-zero-input frame
3. `83b8f3f` raw rgba() literals in Hud/AttractScreen/DeathCard → new tokens (--crosshair-ink, --sweep-glow, --sweep-glow-mid, --death-veil) + designTokens gate test. No other manifesto violations

## DEFER (cosmetic)
HUD shows "NEXT ▸ 25" at door 24; stale door-13 comment in loop.test.ts; QA-PHASE9 row in dev DB (gitignored). Render-layer hex = tokenColor fallbacks — sanctioned.

## Orchestrator browser checks (done by orchestrator 2026-11-18) — ALL PASS
- **Idle-reset (fix 1)**: PASS — pressed E → run started (door 01, HUD live) → 35s idle → attract screen returned. Kiosk no longer sticks off-attract after die/finish.
- **Gamepad (fix 2)**: unit-tested only (no physical pad on this machine); loop.ts onActivity-per-input-frame verified in loop.test.ts.
- **Console/FPS on new bundle**: PASS — 0 errors, 57 FPS steady on ?auto=1.
- **Re-shots**: qa/shots/gaunt-tell-door7.png (amber GAUNT tell visible at door 07, HUD kit + checkpoint pips + oil 68%).
- **IPv6 bind**: use `localhost:8402` (preview binds ::1); deploy task should bind 0.0.0.0 for booth LAN.
- Pointer-lock console note ("root document not valid for pointer lock") is a Playwright automation artifact, not a product defect.

## QA verdict: PASS (999 vitest, 55+1skip pytest, ip-check clean, 3 fixes committed b685b66/a86152c/83b8f3f)
