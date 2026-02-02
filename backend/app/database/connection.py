"""Database connection and session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

from app.config import get_settings

settings = get_settings()


def _with_sslmode(database_url: str) -> str:
    """Ensure sslmode=require for non-local Postgres URLs."""
    parsed = urlparse(database_url)
    if not parsed.scheme.startswith("postgres"):
        return database_url
    if parsed.hostname in {"localhost", "127.0.0.1"}:
        return database_url
    query = dict(parse_qsl(parsed.query))
    if "sslmode" not in query:
        query["sslmode"] = "require"
        parsed = parsed._replace(query=urlencode(query))
    return urlunparse(parsed)

engine = create_engine(
    _with_sslmode(settings.database_url),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
