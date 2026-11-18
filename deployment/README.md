# HALLWAKE — local run recipe (Phase 10, verified 2026-11-18)

Everything below was run and verified on this machine. Loopback-only binds are
the safe default (qa/security.md §7); LAN/kiosk serving decision + prerequisite
patches live in deployment/booth.md.

## One command (recommended)

```powershell
# Windows (PowerShell). Builds dist/, starts backend + preview, prints URLs.
.\deployment\start.ps1
# stop what it started:
.\deployment\start.ps1 -Stop
# alternate ports if 8401/8402 are taken (e.g. by the orchestrator's servers):
.\deployment\start.ps1 -BackendPort 8411 -FrontendPort 8412
```

```bash
# Linux/macOS/Git Bash
./deployment/start.sh            # BACKEND_PORT/FRONTEND_PORT env to override
./deployment/start.sh --stop
```

Then open **http://localhost:8402** (or http://127.0.0.1:8402).

## Manual steps (what the script does, exactly)

Backend (terminal 1):

```powershell
cd app\backend
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8401
```

Fresh venv if missing: `python -m venv .venv` then
`.venv\Scripts\pip install -r requirements.txt`.

Frontend (terminal 2):

```powershell
cd app\frontend
npm ci            # once; package-lock pins everything
npm run build     # tsc -b && vite build -> dist/ (verified: index.html + assets/)
npx vite preview --host 127.0.0.1 --port 8402
```

`vite preview` serves dist/ and proxies `/api` -> `http://127.0.0.1:8401`
(vite.config.ts:7; override target with env `VITE_API_TARGET`). Verified:
`curl http://127.0.0.1:8402/api/scores` -> 200 JSON through the proxy.

## The localhost-vs-::1 bind gotcha (verified with netstat)

- `uvicorn --host 127.0.0.1` listens on **IPv4 loopback only**.
- Bare `vite preview` (no `--host`) binds **`[::1]:8402` — IPv6 loopback only**
  on this machine (netstat showed `TCP [::1]:8402 LISTENING`).
- On Windows `localhost` resolves to `::1` first, so `curl http://localhost:8401`
  can fail with connection-refused even though the backend is up.

Rules: **always curl the backend as `http://127.0.0.1:8401`**; browsers handle
`localhost` fine (they retry both families). The start scripts pin preview to
`--host 127.0.0.1` so both servers are IPv4 loopback and `127.0.0.1` works for
both. Do NOT "fix" this by binding uvicorn to `0.0.0.0` — that exposes the
unauthenticated leaderboard to the LAN (security.md §7).

## Demo flags (src/game/GameShell.tsx)

- `?auto=1` — autopilot plays doors 1-24 hands-free (the perf-gate entry).
- `?fps=1` — corner FPS meter.
- `?quality=low|mid|high` — pin a tier. Without it, **quality auto-detect**
  probes real rendered fps and steps the preset down whenever fps < 45, until
  it holds the booth 60 fps target (GameShell.tsx:182-197).
- Booth demo URL: `http://localhost:8402/?auto=1&fps=1`.

## Env vars the backend reads (app/backend/llm.py:22-23)

| Var | Default | Meaning |
|---|---|---|
| `HF_LLM_URL` | `http://100.124.134.63:8890/v1` | OpenAI-compatible vLLM base URL. **Tailscale/LAN IP — must be network-reachable from wherever the backend runs.** Unreachable is fine: flavor degrades to canned, game fully playable. |
| `HF_LLM_MODEL` | `qwen3.8-flash-next` | model name sent to vLLM |

No secrets anywhere; the endpoint is keyless by design. Set them in the shell
before launching uvicorn if the booth machine's vLLM address differs.

## Verified proof (2026-11-18, this machine, start.ps1 -BackendPort 8411 -FrontendPort 8412)

```
$ curl -s http://127.0.0.1:8411/health
{"status":"ok","llm":{"online":true,"model":"qwen3.8-flash-next"}}

$ curl -s "http://127.0.0.1:8411/api/scores?limit=3"
{"scores":[{"id":3,"name":"QA-PHASE9","deepest_door":24,"run_time_ms":280000,
 "deaths":2,...},{"id":1,"name":"GATE-TEST",...},{"id":2,"name":"X",...}]}

$ curl -s http://127.0.0.1:8412/ | head -6
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    ...
    <title>HALLWAKE</title>

$ curl -s "http://127.0.0.1:8412/api/scores?limit=2"   # preview proxy -> backend
{"scores":[{"id":3,"name":"QA-PHASE9",...},{"id":1,"name":"GATE-TEST",...}]}
```

`start.ps1 -Stop` then removed both processes; netstat confirmed only the
orchestrator's 8401/8402 remained listening.

## Build output (verified)

`npm run build` -> `tsc -b && vite build`, vite 7.3.8, 65 modules,
dist/index.html 0.39 kB, assets/index-*.css 3.18 kB, assets/index-*.js
800.90 kB (gzip 221 kB — fine for a kiosk; the >500 kB chunk warning is
expected for a Three.js game and safe to ignore at booth scale).
