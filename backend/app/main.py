"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database.connection import engine
from app.database.models import Base
from app.routes import health, analytics, sync

settings = get_settings()


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


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Guesty Insights Engine",
        "version": "1.0.0",
        "docs": "/docs",
    }
