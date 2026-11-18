# HALLWAKE security audit — Phase 9 (security)

Date 2026-11-18. Scope: all 102 tracked files (app/, scripts/, .github/, plan/, qa/),
full git history, built bundle (app/frontend/dist), live server binds, dependency
audits. Verdict per area: PASS / FIXED / FINDING.

**No unfixed Critical or High findings.**

## 1. Secrets — PASS
- Keyword + high-entropy scan over every tracked file: zero real secrets. All
  "token" hits are design tokens (CSS custom properties, fx.ts/tokens.css).
- Git history: `git log --all -S` for sk-/AKIA/AIza prefixes and
  `--diff-filter=A` for .env/.pem/.key/id_rsa — nothing ever added. `.env`
  gitignored (.gitignore:8).
- Built bundle dist/assets/*.js: no secret patterns; only relative `/api` calls,
  no external URLs.
- LAN vLLM URL (app/backend/llm.py:21) is keyless by design (state.json) — not a secret.

## 2. Injection — PASS
- SQL: every query parameterized with `?` (app/backend/db.py:57-69, 79-85); DDL
  static `executescript` (db.py:44); grep for f-string/concatenated SQL: no hits.
- No `eval`/`exec`/`new Function`/`subprocess`/`shell=True`/`os.system` in shipped code.
- XSS: no `innerHTML`/`dangerouslySetInnerHTML`/`insertAdjacentHTML` in src
  (only a comment in flavorClient.ts:5). Untrusted strings render as JSX text
  (escaped): leaderboard names Leaderboard.tsx:87, flavor text LoreCard.tsx:30.
  LLM output sanitized server-side (routers/flavor.py:100-106: control chars,
  HTML tags, 240-char cap) and again client-side (net/flavorClient.ts:28-35).
- Input validation: scores.py:24-40 (name `^[A-Za-z0-9 .'-]{1,12}$`, int bounds,
  bools rejected); flavor.py:64-77 kind whitelist + door/deaths bounds; entity
  whitelist enforced at flavor.py:119 — unknown entity never reaches the prompt
  (test_flavor.py:92-99). Prompt built ONLY from validated fields + server-side
  door table (flavor.py:80-97; test_flavor.py:73-89 proves client extras ignored).
- Path traversal: backend mounts no static files (main.py has no StaticFiles);
  vite preview serves the built dist via its own static handling.
- SSRF: the only outbound URL is fixed at llm.py:21 (env-overridable), never
  derived from request fields.

## 3. DoS / abuse — FIXED (1) + FINDING (2 Medium)
- FIXED (Medium): flavor firewall had an unbounded wait queue — `Semaphore(1)`
  acquire blocked with no bound, so a flood of POST /api/flavor piled up pending
  coroutines behind the 0.8 s slot. Busy slot now returns None immediately
  (canned fallback), matching the firewall contract. Commit 1675907; regression
  test `test_busy_firewall_never_queues` (56 backend tests pass).
  NOTE: the live uvicorn (PID from QA reuse) predates this fix — restart to load.
- FINDING (Medium): no request body size cap on POST /api/scores or /api/flavor
  (uvicorn/FastAPI default unlimited). Not reachable while 8401 is loopback-only;
  if 8401 is ever exposed, add ASGI middleware rejecting bodies > ~16 KB.
- FINDING (Medium): no rate limit on POST /api/scores — spam grows the SQLite
  table unbounded. Same loopback mitigation; if exposed, add an in-memory token
  bucket (e.g. 10/min). GET /api/scores limit is clamped 1..50 (scores.py:45).
- CORS locked to `http://localhost:8402` + `http://127.0.0.1:8402`, no
  credentials (main.py:24-29) — matches architecture.md:223-224. Acceptable.

## 4. Scope — PASS
- Only external URL in shipped code: LAN vLLM `http://100.124.134.63:8890/v1`
  (llm.py:21; Tailscale/LAN range, keyless). All other grep hits are localhost,
  package-lock metadata, or font license text (never fetched at runtime).
- No paid-API references anywhere (llm.py docstring forbids; no openai/anthropic).
- IP gate: scripts/ip-check.sh (15 banned Roblox/DOORS terms) runs in CI
  (.github/workflows/ci.yml:37-41) and passes locally (exit 0).

## 5. Dependencies — FIXED (Critical/High, dev-only) + FINDING (Low)
- Backend: `pip-audit -r requirements.txt` — no known vulnerabilities.
- Frontend initial `npm audit`: 9 (2 critical, 4 high, 3 moderate) — ALL nested
  under vitest 2.1.9's private vite 5.4.21 copy (tinypool prototype-pollution
  RCE GHSA-5gmw-xhrv-c9v3, @vitest/mocker path traversal/code injection,
  esbuild 0.21.5 dev-server advisory). None in the shipped bundle; the booth's
  vite preview runs vite 7.3.8 with patched deps.
- FIXED: vitest 2.1.9 -> 5.1.1 (commit 69384ca) — 999/999 tests green, build clean.
- FINDING (Low): remaining 5 npm "high" entries are one advisory — picomatch
  ReDoS GHSA-fc5q-39xc-vjpf, flagged `picomatch *` (no fixed release upstream);
  dev-time glob matching only, unreachable via `vite preview`. Recheck upstream.
- FINDING (Low): requirements.txt uses `>=` ranges (not pinned); package-lock.json
  + `npm ci` pin the frontend. Pin backend exact versions for booth reproducibility.

## 6. Auth / authz — N/A (PASS)
No auth by design (single-player kiosk, Cat 3 booth). No hardcoded credentials
(history + tree scan). Leaderboard writes intentionally unauthenticated —
acceptable only while the backend stays loopback-only (see 7).

## 7. Booth exposure — PASS + operator decision
- Verified live binds (netstat): uvicorn `--host 127.0.0.1` port 8401 (no
  --reload, no debug); vite preview bound `::1:8402` only. Both loopback-only.
- Intended path verified empirically: browser -> 8402 same-origin -> vite
  preview proxies /api -> 127.0.0.1:8401 (curl 8402/api/scores -> 200 JSON).
  Backend should stay loopback-only; do NOT bind 8401 on the booth LAN.
- OPERATOR DECISION: if the kiosk must be served to another machine (LAN IP),
  then (a) vite preview must bind that interface, (b) add the exact booth origin
  to the CORS allowlist (main.py:26), and (c) the two Medium DoS findings in §3
  become High and must be fixed first. Recommended default: one kiosk machine,
  everything loopback, as running today.

## Commits
- 1675907 sec: flavor firewall never queues — busy slot degrades to canned
- 69384ca sec: bump vitest 2.1.9 -> 5.1.1 to clear dev-toolchain advisories
