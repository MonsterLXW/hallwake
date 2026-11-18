"""HALLWAKE backend — leaderboard (scores) + LLM flavor proxy.

scores router always included; flavor router lands independently in T6
(routers/flavor.py) and is included via try/except until then.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import db
from routers import scores


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="HALLWAKE", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8402", "http://127.0.0.1:8402"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(scores.router)

try:
    from routers.flavor import router as flavor_router
    app.include_router(flavor_router)
except ImportError:
    pass


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"ok": False, "error": "invalid request"})


@app.get("/health")
def health() -> dict:
    model = "unknown"
    online = False
    try:
        import llm
        model = llm.MODEL
        probe = getattr(llm, "probe", None)
        if callable(probe):
            online = bool(probe())
    except Exception:
        online = False
    return {"status": "ok", "llm": {"online": online, "model": model}}
