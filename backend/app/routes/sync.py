"""Sync endpoints for triggering and monitoring data sync."""

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.connection import get_db
from app.database.models import SyncLog

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/trigger")
async def trigger_sync(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Trigger a manual data sync from Guesty."""
    # Import here to avoid circular imports
    from app.services.sync import run_full_sync
    
    # Check if sync is already running
    running = db.query(SyncLog).filter(SyncLog.status == "running").first()
    if running:
        return {
            "status": "already_running",
            "message": "A sync is already in progress",
            "sync_id": running.id,
        }
    
    # Start sync in background
    background_tasks.add_task(run_full_sync)
    
    return {
        "status": "started",
        "message": "Sync started in background",
    }


@router.get("/status")
async def get_sync_status(db: Session = Depends(get_db)):
    """Get the status of the last sync operation."""
    # Get most recent sync log
    last_sync = db.query(SyncLog).order_by(desc(SyncLog.started_at)).first()
    
    if not last_sync:
        return {
            "status": "never_run",
            "message": "No sync has been run yet",
        }
    
    return {
        "status": last_sync.status,
        "entity_type": last_sync.entity_type,
        "records_synced": last_sync.records_synced,
        "started_at": last_sync.started_at.isoformat() if last_sync.started_at else None,
        "completed_at": last_sync.completed_at.isoformat() if last_sync.completed_at else None,
        "error_message": last_sync.error_message,
    }
