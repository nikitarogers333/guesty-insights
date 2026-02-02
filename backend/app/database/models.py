"""SQLAlchemy ORM models for the database."""

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Integer, BigInteger, Boolean, DateTime, 
    Date, ForeignKey, Index, Text, Enum as SQLEnum
)
from sqlalchemy.orm import declarative_base, relationship
import enum

Base = declarative_base()


class SyncStatus(enum.Enum):
    """Status of a sync operation."""
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class ReservationStatus(enum.Enum):
    """Status of a reservation."""
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    INQUIRY = "inquiry"


class Listing(Base):
    """Property/listing from Guesty."""
    __tablename__ = "listings"
    
    id = Column(String(36), primary_key=True)
    guesty_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    bedrooms = Column(Integer, default=0)
    bathrooms = Column(Integer, default=0)
    property_type = Column(String(100))
    active = Column(Boolean, default=True)
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    reservations = relationship("Reservation", back_populates="listing")
    conversations = relationship("Conversation", back_populates="listing")


class Guest(Base):
    """Guest record from Guesty (PII hashed)."""
    __tablename__ = "guests"
    
    id = Column(String(36), primary_key=True)
    guesty_id = Column(String(50), unique=True, nullable=False, index=True)
    email_hash = Column(String(64))  # SHA-256 hash
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    reservations = relationship("Reservation", back_populates="guest")
    conversations = relationship("Conversation", back_populates="guest")


class Reservation(Base):
    """Reservation/booking from Guesty."""
    __tablename__ = "reservations"
    
    id = Column(String(36), primary_key=True)
    guesty_id = Column(String(50), unique=True, nullable=False, index=True)
    listing_id = Column(String(36), ForeignKey("listings.id"), nullable=True)
    guest_id = Column(String(36), ForeignKey("guests.id"), nullable=True)
    
    source = Column(String(50), nullable=False, index=True)  # Normalized OTA source
    status = Column(String(20), nullable=False, index=True)
    
    check_in = Column(Date, nullable=False, index=True)
    check_out = Column(Date, nullable=False)
    booked_at = Column(DateTime, nullable=False, index=True)
    
    # Stored as cents (integers) to avoid floating point issues
    total_price = Column(BigInteger, default=0)
    
    # Calculated fields (stored for query performance)
    nights = Column(Integer, default=0)
    lead_time_days = Column(Integer, default=0)
    
    cancelled_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    listing = relationship("Listing", back_populates="reservations")
    guest = relationship("Guest", back_populates="reservations")
    conversation = relationship("Conversation", back_populates="reservation", uselist=False)
    
    # Indexes for analytics queries
    __table_args__ = (
        Index("ix_reservations_source_status", "source", "status"),
        Index("ix_reservations_check_in_source", "check_in", "source"),
        Index("ix_reservations_booked_at_source", "booked_at", "source"),
    )


class Conversation(Base):
    """Inquiry/conversation from Guesty."""
    __tablename__ = "conversations"
    
    id = Column(String(36), primary_key=True)
    guesty_id = Column(String(50), unique=True, nullable=False, index=True)
    listing_id = Column(String(36), ForeignKey("listings.id"), nullable=True)
    guest_id = Column(String(36), ForeignKey("guests.id"), nullable=True)
    reservation_id = Column(String(36), ForeignKey("reservations.id"), nullable=True)
    
    source = Column(String(50), nullable=False, index=True)
    converted_to_booking = Column(Boolean, default=False, index=True)
    
    first_message_at = Column(DateTime, nullable=True)
    message_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    listing = relationship("Listing", back_populates="conversations")
    guest = relationship("Guest", back_populates="conversations")
    reservation = relationship("Reservation", back_populates="conversation")
    
    __table_args__ = (
        Index("ix_conversations_source_converted", "source", "converted_to_booking"),
    )


class SyncLog(Base):
    """Log of sync operations."""
    __tablename__ = "sync_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False)  # listings, reservations, etc.
    records_synced = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default="running")
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
