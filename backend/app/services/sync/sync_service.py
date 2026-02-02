"""Data synchronization service for pulling data from Guesty."""

import logging
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.database.models import Listing, Guest, Reservation, Conversation, SyncLog
from app.services.guesty.client import get_guesty_client
from app.services.guesty.normalizer import normalize_source
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def hash_email(email: Optional[str]) -> Optional[str]:
    """Hash email for privacy (only store hash)."""
    if not email:
        return None
    return hashlib.sha256(email.lower().encode()).hexdigest()


def sync_listings(db: Session, client) -> int:
    """Sync listings from Guesty."""
    logger.info("Starting listings sync")
    count = 0
    skip = 0
    limit = 100
    
    while True:
        result = client.get_listings(skip=skip, limit=limit)
        listings = result.get("results", [])
        
        if not listings:
            break
        
        for item in listings:
            existing = db.query(Listing).filter(
                Listing.guesty_id == item["_id"]
            ).first()
            
            if existing:
                existing.name = item.get("title", "")
                existing.bedrooms = item.get("bedrooms", 0)
                existing.bathrooms = item.get("bathrooms", 0)
                existing.property_type = item.get("propertyType", "")
                existing.active = item.get("active", True)
                existing.address = item.get("address", {}).get("full", "")
                existing.updated_at = datetime.utcnow()
            else:
                listing = Listing(
                    id=str(uuid.uuid4()),
                    guesty_id=item["_id"],
                    name=item.get("title", ""),
                    bedrooms=item.get("bedrooms", 0),
                    bathrooms=item.get("bathrooms", 0),
                    property_type=item.get("propertyType", ""),
                    active=item.get("active", True),
                    address=item.get("address", {}).get("full", ""),
                )
                db.add(listing)
            count += 1
        
        db.commit()
        
        if len(listings) < limit:
            break
        skip += limit
    
    logger.info(f"Synced {count} listings")
    return count


def sync_guests(db: Session, client) -> int:
    """Sync guests from Guesty (with PII hashing)."""
    logger.info("Starting guests sync")
    count = 0
    skip = 0
    limit = 100
    
    while True:
        result = client.get_guests(skip=skip, limit=limit)
        guests = result.get("results", [])
        
        if not guests:
            break
        
        for item in guests:
            existing = db.query(Guest).filter(
                Guest.guesty_id == item["_id"]
            ).first()
            
            email_hash = hash_email(item.get("email"))
            
            if existing:
                existing.email_hash = email_hash
                existing.updated_at = datetime.utcnow()
            else:
                guest = Guest(
                    id=str(uuid.uuid4()),
                    guesty_id=item["_id"],
                    email_hash=email_hash,
                )
                db.add(guest)
            count += 1
        
        db.commit()
        
        if len(guests) < limit:
            break
        skip += limit
    
    logger.info(f"Synced {count} guests")
    return count


def sync_reservations(db: Session, client) -> int:
    """Sync reservations from Guesty with calculated fields."""
    logger.info("Starting reservations sync")
    count = 0
    skip = 0
    limit = 100
    
    # Get data from last N years
    lookback_date = datetime.utcnow() - timedelta(days=settings.sync_lookback_years * 365)
    filters = [
        {
            "field": "checkIn",
            "operator": "$gte",
            "value": lookback_date.strftime("%Y-%m-%dT00:00:00Z")
        }
    ]
    
    # Build lookup maps for foreign keys
    listing_map = {l.guesty_id: l.id for l in db.query(Listing).all()}
    guest_map = {g.guesty_id: g.id for g in db.query(Guest).all()}
    
    while True:
        result = client.get_reservations(skip=skip, limit=limit, filters=filters)
        reservations = result.get("results", [])
        
        if not reservations:
            break
        
        for item in reservations:
            existing = db.query(Reservation).filter(
                Reservation.guesty_id == item["_id"]
            ).first()
            
            # Parse dates
            check_in = datetime.fromisoformat(item["checkIn"].replace("Z", "+00:00")).date()
            check_out = datetime.fromisoformat(item["checkOut"].replace("Z", "+00:00")).date()
            booked_at = datetime.fromisoformat(item["createdAt"].replace("Z", "+00:00"))
            
            # Calculate fields
            nights = (check_out - check_in).days
            lead_time_days = (check_in - booked_at.date()).days
            
            # Get price in cents
            money = item.get("money", {})
            total_price = int(float(money.get("totalPrice", 0)) * 100)
            
            # Normalize source
            source = normalize_source(item.get("source", "unknown"))
            
            # Map status
            status = item.get("status", "confirmed")
            
            # Get foreign keys
            listing_guesty_id = item.get("listingId")
            guest_guesty_id = item.get("guestId")
            listing_id = listing_map.get(listing_guesty_id)
            guest_id = guest_map.get(guest_guesty_id)
            
            # Handle cancelled_at
            cancelled_at = None
            if status == "cancelled" and item.get("canceledAt"):
                cancelled_at = datetime.fromisoformat(item["canceledAt"].replace("Z", "+00:00"))
            
            if existing:
                existing.listing_id = listing_id
                existing.guest_id = guest_id
                existing.source = source
                existing.status = status
                existing.check_in = check_in
                existing.check_out = check_out
                existing.booked_at = booked_at
                existing.total_price = total_price
                existing.nights = nights
                existing.lead_time_days = lead_time_days
                existing.cancelled_at = cancelled_at
                existing.updated_at = datetime.utcnow()
            else:
                reservation = Reservation(
                    id=str(uuid.uuid4()),
                    guesty_id=item["_id"],
                    listing_id=listing_id,
                    guest_id=guest_id,
                    source=source,
                    status=status,
                    check_in=check_in,
                    check_out=check_out,
                    booked_at=booked_at,
                    total_price=total_price,
                    nights=nights,
                    lead_time_days=lead_time_days,
                    cancelled_at=cancelled_at,
                )
                db.add(reservation)
            count += 1
        
        db.commit()
        
        if len(reservations) < limit:
            break
        skip += limit
    
    logger.info(f"Synced {count} reservations")
    return count


def sync_conversations(db: Session, client) -> int:
    """Sync conversations from Guesty."""
    logger.info("Starting conversations sync")
    count = 0
    skip = 0
    limit = 100
    
    # Build lookup maps
    listing_map = {l.guesty_id: l.id for l in db.query(Listing).all()}
    guest_map = {g.guesty_id: g.id for g in db.query(Guest).all()}
    reservation_map = {r.guesty_id: r.id for r in db.query(Reservation).all()}
    
    while True:
        result = client.get_conversations(skip=skip, limit=limit)
        conversations = result.get("results", [])
        
        if not conversations:
            break
        
        for item in conversations:
            existing = db.query(Conversation).filter(
                Conversation.guesty_id == item["_id"]
            ).first()
            
            # Get foreign keys
            listing_guesty_id = item.get("listingId")
            guest_guesty_id = item.get("guestId")
            reservation_guesty_id = item.get("reservationId")
            
            listing_id = listing_map.get(listing_guesty_id)
            guest_id = guest_map.get(guest_guesty_id)
            reservation_id = reservation_map.get(reservation_guesty_id)
            
            # Normalize source
            source = normalize_source(item.get("source", "unknown"))
            
            # Check if converted to booking
            converted_to_booking = reservation_id is not None
            
            # Parse first message time
            first_message_at = None
            if item.get("createdAt"):
                first_message_at = datetime.fromisoformat(item["createdAt"].replace("Z", "+00:00"))
            
            message_count = item.get("messageCount", 0)
            
            if existing:
                existing.listing_id = listing_id
                existing.guest_id = guest_id
                existing.reservation_id = reservation_id
                existing.source = source
                existing.converted_to_booking = converted_to_booking
                existing.first_message_at = first_message_at
                existing.message_count = message_count
                existing.updated_at = datetime.utcnow()
            else:
                conversation = Conversation(
                    id=str(uuid.uuid4()),
                    guesty_id=item["_id"],
                    listing_id=listing_id,
                    guest_id=guest_id,
                    reservation_id=reservation_id,
                    source=source,
                    converted_to_booking=converted_to_booking,
                    first_message_at=first_message_at,
                    message_count=message_count,
                )
                db.add(conversation)
            count += 1
        
        db.commit()
        
        if len(conversations) < limit:
            break
        skip += limit
    
    logger.info(f"Synced {count} conversations")
    return count


def run_full_sync():
    """Run a complete sync of all entities."""
    logger.info("Starting full data sync")
    db = SessionLocal()
    
    try:
        client = get_guesty_client()
        
        # Create sync log entry
        sync_log = SyncLog(
            entity_type="full",
            started_at=datetime.utcnow(),
            status="running",
        )
        db.add(sync_log)
        db.commit()
        
        total_records = 0
        
        # Sync in order (dependencies first)
        total_records += sync_listings(db, client)
        total_records += sync_guests(db, client)
        total_records += sync_reservations(db, client)
        total_records += sync_conversations(db, client)
        
        # Update sync log
        sync_log.records_synced = total_records
        sync_log.completed_at = datetime.utcnow()
        sync_log.status = "success"
        db.commit()
        
        logger.info(f"Full sync completed successfully. Total records: {total_records}")
        
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        
        # Update sync log with error
        sync_log = db.query(SyncLog).filter(SyncLog.status == "running").first()
        if sync_log:
            sync_log.status = "failed"
            sync_log.error_message = str(e)
            sync_log.completed_at = datetime.utcnow()
            db.commit()
        
        raise
    finally:
        db.close()
