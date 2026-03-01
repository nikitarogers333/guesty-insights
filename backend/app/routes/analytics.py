"""Analytics endpoints for dashboard data."""

from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract, Date

from app.database.connection import get_db
from app.database.models import Reservation, Listing, Conversation

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def parse_date(date_str: Optional[str]) -> Optional[date]:
    """Parse date string to date object."""
    if not date_str:
        return None
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def apply_filters(query, start_date: Optional[str], end_date: Optional[str], 
                  source: Optional[str], listing_id: Optional[str]):
    """Apply common filters to a query."""
    if start_date:
        query = query.filter(Reservation.check_in >= parse_date(start_date))
    if end_date:
        query = query.filter(Reservation.check_in <= parse_date(end_date))
    if source:
        query = query.filter(Reservation.source == source)
    if listing_id:
        query = query.filter(Reservation.listing_id == listing_id)
    return query


@router.get("/summary")
async def get_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    listing_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get high-level KPI summary."""
    # Base query for reservations
    query = db.query(Reservation).filter(Reservation.status != 'cancelled')
    query = apply_filters(query, start_date, end_date, source, listing_id)
    
    # Aggregate metrics
    stats = db.query(
        func.count(Reservation.id).label('total_bookings'),
        func.coalesce(func.sum(Reservation.total_price), 0).label('total_revenue'),
        func.coalesce(func.avg(Reservation.lead_time_days), 0).label('avg_lead_time_days'),
        func.coalesce(func.avg(Reservation.nights), 0).label('avg_length_of_stay'),
    ).filter(Reservation.status != 'cancelled')
    stats = apply_filters(stats, start_date, end_date, source, listing_id)
    result = stats.first()
    
    # Cancellation rate
    all_bookings = db.query(func.count(Reservation.id))
    all_bookings = apply_filters(all_bookings, start_date, end_date, source, listing_id)
    total_all = all_bookings.scalar() or 0
    
    cancelled = db.query(func.count(Reservation.id)).filter(Reservation.status == 'cancelled')
    cancelled = apply_filters(cancelled, start_date, end_date, source, listing_id)
    total_cancelled = cancelled.scalar() or 0
    
    cancellation_rate = total_cancelled / total_all if total_all > 0 else 0
    
    # Conversion rate (from conversations)
    conv_query = db.query(Conversation)
    if start_date:
        conv_query = conv_query.filter(Conversation.created_at >= parse_date(start_date))
    if end_date:
        conv_query = conv_query.filter(Conversation.created_at <= parse_date(end_date))
    if source:
        conv_query = conv_query.filter(Conversation.source == source)
    
    total_convs = conv_query.count()
    converted = conv_query.filter(Conversation.converted_to_booking == True).count()
    conversion_rate = converted / total_convs if total_convs > 0 else 0
    
    # Top source
    top_source_query = db.query(
        Reservation.source,
        func.count(Reservation.id).label('count')
    ).filter(Reservation.status != 'cancelled')
    top_source_query = apply_filters(top_source_query, start_date, end_date, source, listing_id)
    top_source_result = top_source_query.group_by(Reservation.source).order_by(func.count(Reservation.id).desc()).first()
    
    return {
        "total_bookings": result.total_bookings or 0,
        "total_revenue": int(result.total_revenue or 0),
        "avg_lead_time_days": round(float(result.avg_lead_time_days or 0), 1),
        "avg_length_of_stay": round(float(result.avg_length_of_stay or 0), 1),
        "conversion_rate": round(conversion_rate, 3),
        "cancellation_rate": round(cancellation_rate, 3),
        "top_source": top_source_result.source if top_source_result else None,
    }


@router.get("/by-source")
async def get_by_source(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    listing_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get metrics grouped by booking source/OTA."""
    query = db.query(
        Reservation.source,
        func.count(Reservation.id).label('bookings'),
        func.coalesce(func.sum(Reservation.total_price), 0).label('revenue'),
        func.coalesce(func.avg(Reservation.lead_time_days), 0).label('avg_lead_time'),
        func.coalesce(func.avg(Reservation.nights), 0).label('avg_nights'),
    ).filter(Reservation.status != 'cancelled')
    
    query = apply_filters(query, start_date, end_date, source, listing_id)
    results = query.group_by(Reservation.source).all()
    
    sources = []
    for r in results:
        adr = r.revenue / (r.bookings * r.avg_nights) if r.bookings > 0 and r.avg_nights > 0 else 0
        sources.append({
            "source": r.source,
            "bookings": r.bookings,
            "revenue": int(r.revenue),
            "avg_lead_time": round(float(r.avg_lead_time), 1),
            "avg_nights": round(float(r.avg_nights), 1),
            "adr": round(adr, 0),
        })
    
    return {"sources": sources}


@router.get("/time-series")
async def get_time_series(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    listing_id: Optional[str] = Query(None),
    interval: str = Query("month"),
    db: Session = Depends(get_db),
):
    """Get bookings and revenue over time."""
    if interval == "week":
        period_func = func.date_trunc('week', Reservation.booked_at)
    else:
        period_func = func.date_trunc('month', Reservation.booked_at)
    
    query = db.query(
        period_func.label('period'),
        func.count(Reservation.id).label('bookings'),
        func.coalesce(func.sum(Reservation.total_price), 0).label('revenue'),
    ).filter(Reservation.status != 'cancelled')
    
    query = apply_filters(query, start_date, end_date, source, listing_id)
    results = query.group_by(period_func).order_by(period_func).all()
    
    data = []
    for r in results:
        period_str = r.period.strftime("%Y-%m") if interval == "month" else r.period.strftime("%Y-%m-%d")
        data.append({
            "period": period_str,
            "bookings": r.bookings,
            "revenue": int(r.revenue),
        })
    
    return {"interval": interval, "data": data}


@router.get("/lead-time-distribution")
async def get_lead_time_distribution(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    listing_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get histogram of booking lead times."""
    query = db.query(Reservation.lead_time_days).filter(
        Reservation.status != 'cancelled',
        Reservation.lead_time_days.isnot(None)
    )
    query = apply_filters(query, start_date, end_date, source, listing_id)
    lead_times = [r.lead_time_days for r in query.all()]
    
    # Define buckets
    buckets = [
        {"range": "0-7", "min": 0, "max": 7, "count": 0},
        {"range": "8-14", "min": 8, "max": 14, "count": 0},
        {"range": "15-30", "min": 15, "max": 30, "count": 0},
        {"range": "31-60", "min": 31, "max": 60, "count": 0},
        {"range": "61-90", "min": 61, "max": 90, "count": 0},
        {"range": "90+", "min": 91, "max": 9999, "count": 0},
    ]
    
    for lt in lead_times:
        for bucket in buckets:
            if bucket["min"] <= lt <= bucket["max"]:
                bucket["count"] += 1
                break
    
    return {"buckets": [{"range": b["range"], "count": b["count"]} for b in buckets]}


@router.get("/conversion-funnel")
async def get_conversion_funnel(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    listing_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get inquiry to booking conversion funnel."""
    # Total conversations (inquiries)
    conv_query = db.query(Conversation)
    if start_date:
        conv_query = conv_query.filter(Conversation.created_at >= parse_date(start_date))
    if end_date:
        conv_query = conv_query.filter(Conversation.created_at <= parse_date(end_date))
    if source:
        conv_query = conv_query.filter(Conversation.source == source)
    if listing_id:
        conv_query = conv_query.filter(Conversation.listing_id == listing_id)
    
    inquiries = conv_query.count()
    
    # Conversations that led to bookings
    bookings = conv_query.filter(Conversation.converted_to_booking == True).count()
    
    # For quotes, we'll estimate as a middle stage (could be refined with actual quote tracking)
    quotes = int(inquiries * 0.6) if inquiries > 0 else 0  # Placeholder estimation
    
    conversion_rate = bookings / inquiries if inquiries > 0 else 0
    
    return {
        "stages": [
            {"stage": "inquiries", "count": inquiries},
            {"stage": "quotes_sent", "count": quotes},
            {"stage": "bookings", "count": bookings},
        ],
        "conversion_rate": round(conversion_rate, 3),
    }


@router.get("/day-of-week")
async def get_day_of_week(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    listing_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get booking patterns by day of week."""
    query = db.query(
        extract('dow', Reservation.booked_at).label('day_num'),
        func.count(Reservation.id).label('bookings'),
    ).filter(Reservation.status != 'cancelled')
    
    query = apply_filters(query, start_date, end_date, source, listing_id)
    results = query.group_by(extract('dow', Reservation.booked_at)).all()
    
    day_names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    day_counts = {i: 0 for i in range(7)}
    
    for r in results:
        day_counts[int(r.day_num)] = r.bookings
    
    days = [{"day": day_names[i], "bookings": day_counts[i]} for i in range(7)]
    
    return {"days": days}


@router.get("/cancellations")
async def get_cancellations(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    listing_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get cancellation statistics."""
    # Total bookings (including cancelled)
    all_query = db.query(Reservation)
    all_query = apply_filters(all_query, start_date, end_date, source, listing_id)
    total_bookings = all_query.count()
    
    # Cancelled bookings
    cancelled_query = db.query(Reservation).filter(Reservation.status == 'cancelled')
    cancelled_query = apply_filters(cancelled_query, start_date, end_date, source, listing_id)
    total_cancellations = cancelled_query.count()
    
    cancellation_rate = total_cancellations / total_bookings if total_bookings > 0 else 0
    
    # By source
    source_stats = db.query(
        Reservation.source,
        func.count(Reservation.id).label('total'),
        func.sum(case((Reservation.status == 'cancelled', 1), else_=0)).label('cancelled'),
    )
    source_stats = apply_filters(source_stats, start_date, end_date, source, listing_id)
    source_results = source_stats.group_by(Reservation.source).all()
    
    by_source = []
    for r in source_results:
        rate = r.cancelled / r.total if r.total > 0 else 0
        by_source.append({
            "source": r.source,
            "cancellations": int(r.cancelled),
            "rate": round(rate, 3),
        })
    
    # Avg days before check-in for cancellations
    avg_days = db.query(
        func.avg(
            extract('day', Reservation.check_in - func.cast(Reservation.cancelled_at, Date))
        )
    ).filter(
        Reservation.status == 'cancelled',
        Reservation.cancelled_at.isnot(None)
    )
    avg_days = apply_filters(avg_days, start_date, end_date, source, listing_id)
    avg_days_result = avg_days.scalar()
    
    return {
        "total_bookings": total_bookings,
        "total_cancellations": total_cancellations,
        "cancellation_rate": round(cancellation_rate, 3),
        "by_source": by_source,
        "avg_days_before_checkin": round(float(avg_days_result or 0), 0),
    }


@router.get("/listing-performance")
async def get_listing_performance(
    db: Session = Depends(get_db),
):
    """Get per-listing revenue breakdown by month and booking channel."""
    # Get all active listings with their details
    listings = db.query(Listing).filter(Listing.active == True).all()

    # Get monthly revenue by listing and source for confirmed bookings
    monthly_data = db.query(
        Reservation.listing_id,
        Reservation.source,
        func.date_trunc('month', Reservation.check_in).label('month'),
        func.count(Reservation.id).label('bookings'),
        func.coalesce(func.sum(Reservation.total_price), 0).label('revenue'),
        func.coalesce(func.sum(Reservation.nights), 0).label('nights'),
    ).filter(
        Reservation.status != 'cancelled',
        Reservation.listing_id.isnot(None),
    ).group_by(
        Reservation.listing_id,
        Reservation.source,
        func.date_trunc('month', Reservation.check_in),
    ).all()

    # Build lookup: listing_id -> { month -> { source -> {bookings, revenue, nights} } }
    from collections import defaultdict
    listing_months = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"bookings": 0, "revenue": 0, "nights": 0})))

    all_months = set()
    all_sources = set()

    for row in monthly_data:
        month_str = row.month.strftime("%Y-%m")
        all_months.add(month_str)
        all_sources.add(row.source)
        entry = listing_months[row.listing_id][month_str][row.source]
        entry["bookings"] += row.bookings
        entry["revenue"] += int(row.revenue)
        entry["nights"] += int(row.nights)

    sorted_months = sorted(all_months)
    sorted_sources = sorted(all_sources)

    # Build response
    results = []
    for listing in listings:
        months_data = listing_months.get(listing.id, {})

        # Total revenue across all months
        total_revenue = 0
        total_bookings = 0
        total_nights = 0

        monthly = []
        for month in sorted_months:
            month_sources = months_data.get(month, {})
            month_total_revenue = 0
            month_total_bookings = 0
            by_source = {}
            for source in sorted_sources:
                s_data = month_sources.get(source, {"bookings": 0, "revenue": 0, "nights": 0})
                by_source[source] = {
                    "bookings": s_data["bookings"],
                    "revenue": s_data["revenue"],
                }
                month_total_revenue += s_data["revenue"]
                month_total_bookings += s_data["bookings"]
                total_nights += s_data["nights"]

            total_revenue += month_total_revenue
            total_bookings += month_total_bookings

            # Only include months where this listing had activity
            if month_total_bookings > 0:
                monthly.append({
                    "month": month,
                    "total_revenue": month_total_revenue,
                    "total_bookings": month_total_bookings,
                    "by_source": by_source,
                })

        results.append({
            "id": listing.id,
            "name": listing.name,
            "address": listing.address,
            "bedrooms": listing.bedrooms,
            "bathrooms": listing.bathrooms,
            "property_type": listing.property_type,
            "total_revenue": total_revenue,
            "total_bookings": total_bookings,
            "total_nights": total_nights,
            "months": monthly,
        })

    # Sort by total revenue descending
    results.sort(key=lambda x: x["total_revenue"], reverse=True)

    return {
        "listings": results,
        "all_months": sorted_months,
        "all_sources": sorted_sources,
    }


@router.get("/listings")
async def get_listings(db: Session = Depends(get_db)):
    """Get list of available listings."""
    listings = db.query(Listing).filter(Listing.active == True).all()
    return {
        "listings": [
            {"id": l.id, "guesty_id": l.guesty_id, "name": l.name}
            for l in listings
        ]
    }


@router.get("/sources")
async def get_sources(db: Session = Depends(get_db)):
    """Get list of booking sources."""
    sources = db.query(Reservation.source).distinct().all()
    return {"sources": [s.source for s in sources if s.source]}
