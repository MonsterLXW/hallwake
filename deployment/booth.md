# HALLWAKE — booth deployment decision (from qa/security.md §7)

## RECOMMENDED (safe default): loopback-only, one kiosk machine

Backend uvicorn on `127.0.0.1:8401` + `vite preview --host 127.0.0.1 --port
8402` on the SAME machine; players use that machine's browser. This is exactly
what runs today and what deployment/start.ps1 boots.

Why: the leaderboard POST is unauthenticated by design (kiosk), and the two
Medium DoS findings (no body-size cap, no score rate-limit) are **unreachable
while 8401 is loopback-only**. Nothing on the LAN can touch the API. Do NOT
bind uvicorn to 0.0.0.0.

## IF (and only if) the kiosk must be served to another machine on the booth LAN

Operator decision required. Steps, in order — **the two patches below MUST
land before exposing anything**:

1. **Apply Patch A (body-size cap) and Patch B (score rate-limit)** to
   `app/backend/main.py`. Without them the two Mediums become High the moment
   8401/8402 are LAN-reachable. (Provided here ready-to-apply; NOT applied to
   the running default — operator decides.)
2. Bind the frontend to the LAN interface:
   `npx vite preview --host 0.0.0.0 --port 8402`
   (or `--host <booth-LAN-IP>` to bind one interface only).
3. Add the exact booth origin to the CORS allowlist — `app/backend/main.py:26`:
   ```python
   allow_origins=["http://localhost:8402", "http://127.0.0.1:8402",
                  "http://<booth-LAN-IP>:8402"],
   ```
   (security.md §7 directive. Note: browsers talking only to :8402 are
   same-origin and the preview proxy forwards `/api` server-side, so CORS is
   not what gates them — this closes the direct-to-8401 path and keeps the
   allowlist honest.)
4. Windows firewall: allow **inbound TCP 8402 only**; leave 8401 unexposed
   (backend stays `--host 127.0.0.1`). Players hit `http://<booth-LAN-IP>:8402`.
5. Re-run the QA contract probes against the exposed stack before the doors
   open (qa/integration.json list).

## Patch A — request body-size cap (Medium #1, security.md §3)

Insert into `app/backend/main.py` after `app = FastAPI(...)` (line 23). Caps
every request body at 16 KB; handles both Content-Length and chunked bodies;
rejects with 413 instead of buffering.

```python
MAX_BODY_BYTES = 16 * 1024

class BodySizeLimitMiddleware:
    """Pure-ASGI body cap. Content-Length checked up front; chunked bodies
    counted as they stream — over-limit requests get http.disconnect so the
    endpoint sees a truncated body (400/422), never a full buffer."""
    def __init__(self, app, max_body: int = MAX_BODY_BYTES):
        self.app = app
        self.max_body = max_body

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        for name, value in scope.get("headers", []):
            if name == b"content-length" and int(value) > self.max_body:
                resp = JSONResponse(status_code=413,
                                    content={"ok": False, "error": "body too large"})
                await resp(scope, receive, send)
                return
        consumed = 0
        async def limited_receive():
            nonlocal consumed
            message = await receive()
            if message["type"] == "http.request":
                consumed += len(message.get("body", b""))
                if consumed > self.max_body:
                    return {"type": "http.disconnect"}
            return message
        await self.app(scope, limited_receive, send)

app.add_middleware(BodySizeLimitMiddleware)
```

(`JSONResponse` is already imported in main.py:10.)

## Patch B — score-POST rate limit (Medium #2, security.md §3)

Insert into `app/backend/main.py` after the CORS middleware block. In-memory
sliding-window bucket, 10 POSTs/min per client IP — enough for a busy kiosk
(a full run is ~4 min), stops unbounded SQLite growth. Single-worker uvicorn
(the kiosk runs exactly one), so in-memory is correct.

```python
import time
from collections import defaultdict

_RATE_WINDOW_S = 60.0
_RATE_MAX = 10
_score_hits: dict[str, list[float]] = defaultdict(list)

@app.middleware("http")
async def score_rate_limit(request: Request, call_next):
    if request.method == "POST" and request.url.path == "/api/scores":
        now = time.monotonic()
        ip = request.client.host if request.client else "unknown"
        bucket = _score_hits[ip]
        bucket[:] = [t for t in bucket if now - t < _RATE_WINDOW_S]
        if len(bucket) >= _RATE_MAX:
            return JSONResponse(status_code=429,
                                content={"ok": False, "error": "slow down"})
        bucket.append(now)
    return await call_next(request)
```

(`Request`/`JSONResponse` already imported in main.py:8-10.)

## After applying patches

- Restart uvicorn (the currently-running backend PID also predates the
  flavor-firewall fix 1675907 — a restart is needed for demo-day anyway).
- Re-run backend tests: `.venv\Scripts\python.exe -m pytest -q` (56 tests).
- Re-verify binds with `netstat -ano | grep 840` — 8401 must still show
  `127.0.0.1` only; only 8402 should be LAN-bound.
