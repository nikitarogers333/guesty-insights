"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database.connection import engine
from app.database.models import Base
from app.routes import health, analytics, sync

settings = get_settings()
FRONTEND_DIR = Path(__file__).resolve().parent / "static"
INDEX_FILE = FRONTEND_DIR / "index.html"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: Create database tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: Cleanup if needed


app = FastAPI(
    title="Guesty Insights Engine",
    description="OTA performance analytics and booking intelligence from Guesty PMS data",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(analytics.router)
app.include_router(sync.router)

# Serve built frontend if present
if (FRONTEND_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")


@app.get("/")
async def root():
    """Root endpoint."""
    if INDEX_FILE.is_file():
        return FileResponse(INDEX_FILE)
    return {
        "name": "Guesty Insights Engine",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    """Serve SPA routes when frontend build exists."""
    if full_path.startswith(("api", "docs", "openapi")):
        raise HTTPException(status_code=404)
    file_path = FRONTEND_DIR / full_path
    if file_path.is_file():
        return FileResponse(file_path)
    if INDEX_FILE.is_file():
        return FileResponse(INDEX_FILE)
    raise HTTPException(status_code=404)
