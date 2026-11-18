"""Backend entrypoint — feature routers are added by hf-backend / hf-ai-engineer."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="HackathonFactory App")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    import llm
    return {"status": "ok", "llm_model": llm.MODEL}


# feature routers (import-and-include when the backend agent creates them)
try:
    from routers.api import router as api_router
    app.include_router(api_router, prefix="/api")
except ImportError:
    pass
