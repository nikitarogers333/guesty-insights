"""Source normalization for Guesty data."""

import logging

logger = logging.getLogger(__name__)

# Map of raw Guesty source values to normalized values
SOURCE_MAP = {
    # Airbnb variants
    "airbnb": "airbnb",
    "airbnb2": "airbnb",
    "Airbnb": "airbnb",
    "AIRBNB": "airbnb",
    
    # VRBO/HomeAway variants
    "vrbo": "vrbo",
    "VRBO": "vrbo",
    "homeaway": "vrbo",
    "HomeAway": "vrbo",
    "HOMEAWAY": "vrbo",
    
    # Booking.com variants
    "booking.com": "booking",
    "Booking.com": "booking",
    "bookingcom": "booking",
    "booking": "booking",
    
    # Expedia
    "expedia": "expedia",
    "Expedia": "expedia",
    
    # Direct bookings
    "direct": "direct",
    "Direct": "direct",
    "manual": "direct",
    "Manual": "direct",
    "website": "direct",
    "Website": "direct",
    
    # TripAdvisor
    "tripadvisor": "tripadvisor",
    "TripAdvisor": "tripadvisor",
    
    # Google
    "google": "google",
    "Google": "google",
}

# Track unknown sources for manual review
_unknown_sources: set = set()


def normalize_source(raw_source: str) -> str:
    """
    Normalize a raw source value from Guesty to a standard value.
    
    Args:
        raw_source: The raw source string from Guesty API
        
    Returns:
        Normalized source string
    """
    if not raw_source:
        return "unknown"
    
    normalized = SOURCE_MAP.get(raw_source)
    
    if normalized is None:
        # Try lowercase match
        normalized = SOURCE_MAP.get(raw_source.lower())
    
    if normalized is None:
        # Unknown source, log for review
        if raw_source not in _unknown_sources:
            _unknown_sources.add(raw_source)
            logger.warning(f"Unknown booking source encountered: {raw_source}")
        return raw_source.lower()
    
    return normalized


def get_unknown_sources() -> set:
    """Get set of unknown sources encountered during normalization."""
    return _unknown_sources.copy()
