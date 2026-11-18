# HALLWAKE — self-contained booth bundle plan (LLM-down guaranteed)

The game is **100% playable with the LLM down by construction**
(architecture.md §11: 0.8 s firewall, canned pools server-side AND client-side,
localStorage leaderboard mirror). This plan covers making the booth bundle
independent of the vLLM (Tailscale IP `100.124.134.63:8890`) entirely.

## Option A (recommended): backend + preview, vLLM optional — zero code change

Same as deployment/README.md. If the vLLM is unreachable, `llm.probe()` fails
-> `/health` reports `llm.online:false`, `/api/flavor` returns 200
`source:"canned"` from server pools, and the leaderboard still persists. The
booth needs only: Python venv + `pip install -r requirements.txt`, Node +
`npm ci`, built `dist/`. No Tailscale required.

## Option B (zero-backend): dist + vite preview only

The frontend already degrades fully on its own: `net/flavorClient.ts` falls
back to local `canned.ts` on any fetch failure, and the leaderboard keeps a
localStorage mirror (`hallwake.scores.local`, last 20). So the leanest bundle
is just the built bundle + a static server:

```powershell
cd app\frontend
npm run build
npx vite preview --host 127.0.0.1 --port 8402   # /api calls fail -> client canned
```

Trade-off: leaderboard rows live only in that browser's localStorage (fine for
one kiosk; lost on profile wipe). No backend process at all.

## Option C (no Node on the booth machine): dist + one tiny Python server

Two sub-choices:

C1. **Static-only** (canned mode, like Option B):
```powershell
cd app\frontend\dist
python -m http.server 8402 --bind 127.0.0.1
```
`/api` fetches fail -> client canned fallback. One stdlib command, no deps.

C2. **Static + /api proxy in one process** (keeps server leaderboard, still no
Node): mount `dist/` on the existing FastAPI app — add to `app/backend/main.py`
(only if the operator wants single-process serving; NOT applied today):

```python
# at END of main.py (after routers) — SPA fallback to index.html:
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="spa")
```

Then one process serves the game AND the API same-origin on :8401 — no CORS,
no proxy, no Node. `StaticFiles(html=True)` already does the SPA fallback to
index.html for `/`. Note: this mount must stay last (it shadows `/`); API
routes registered earlier win.

## Bundle contents (what to copy to the booth machine)

- `app/frontend/dist/` (built; verified today) — or rebuild on booth with
  `npm ci && npm run build`.
- `app/backend/` **without** `.venv/` and `data/` (venvs are not portable
  across machines; DB recreates itself on first start).
- `deployment/` (start scripts + these docs).
- On the booth machine: `python -m venv .venv && .venv\Scripts\pip install -r
  requirements.txt` (use the pinned lock per production-checklist.md), and
  `npm ci` only if using vite preview (Options A/B).
- Fresh DB: delete `app/backend/data/hallwake.db` before the booth opens
  (dev GATE-TEST rows live there; it is gitignored).

## LLM-down verification at the booth (run once, keep as evidence)

```
set HF_LLM_URL=http://127.0.0.1:1/v1        # dead endpoint on purpose
start backend; curl http://127.0.0.1:8401/health
  -> {"status":"ok","llm":{"online:false,...}}
curl -X POST http://127.0.0.1:8401/api/flavor -H "content-type: application/json" ^
     -d "{\"kind\":\"epitaph\",\"door\":7,\"entity\":\"GAUNT\",\"deaths\":1}"
  -> 200 {"available":false,"source":"canned","text":"..."}
```

Game plays identically; only flavor text source changes. That is the booth
guarantee: vLLM reachability is a nice-to-have, never a dependency.
