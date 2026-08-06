import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

from app.routers import clients, submissions, templates, programs, dashboard, mobile
from app.storage import UPLOAD_DIR

load_dotenv()

logger = logging.getLogger("uvicorn.error")


def run_migrations() -> None:
    """Apply any pending Alembic migrations against DATABASE_URL on startup.

    The deploy workflow (.github/workflows/main_api-mtp2026.yml) only zips and
    ships code — there's no separate migration step and no CI access to the
    production DB credentials — so the app applies its own schema on boot.
    alembic upgrade is a no-op once already at head, so this is cheap and safe
    on every restart, not just the first one after a schema change.
    """
    try:
        from alembic import command
        from alembic.config import Config

        backend_dir = Path(__file__).resolve().parent.parent
        config = Config(str(backend_dir / "alembic.ini"))
        config.set_main_option("script_location", str(backend_dir / "alembic"))
        command.upgrade(config, "head")
    except Exception:
        logger.exception("Alembic migration on startup failed — continuing with existing schema")


run_migrations()

app = FastAPI(title="MyTherapyPath API", version="1.0.0")
app.mount("/media", StaticFiles(directory=str(UPLOAD_DIR)), name="media")

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router,         prefix="/v1")
app.include_router(submissions.router,     prefix="/v1")
app.include_router(templates.router,       prefix="/v1")
app.include_router(programs.router,        prefix="/v1")
app.include_router(dashboard.router,       prefix="/v1")
app.include_router(mobile.router,          prefix="/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
