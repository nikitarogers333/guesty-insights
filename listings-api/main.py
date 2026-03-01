"""
Listing Performance API — lightweight micro-service.
Connects to the same Guesty Insights Postgres database and serves
the /api/analytics/listing-performance endpoint.
"""

import os
from collections import defaultdict
from datetime import date

import asyncpg
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Guesty Listings API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pool = None


def get_database_url():
    """Build database URL from individual DB_* vars or fall back to DATABASE_URL."""
    # Try individual variables first (matches existing backend config)
    db_host = os.environ.get("DB_HOST")
    db_name = os.environ.get("DB_NAME")
    db_user = os.environ.get("DB_USER")
    db_password = os.environ.get("DB_PASSWORD")
    db_port = os.environ.get("DB_PORT", "5432")

    if db_host and db_name and db_user and db_password:
        return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

    # Fall back to DATABASE_URL if set
    return os.environ.get("DATABASE_URL", "")


@app.on_event("startup")
async def startup():
    global pool
    database_url = get_database_url()
    if not database_url:
        raise RuntimeError("No database configuration found. Set DB_HOST/DB_NAME/DB_USER/DB_PASSWORD or DATABASE_URL")
    pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)


@app.on_event("shutdown")
async def shutdown():
    global pool
    if pool:
        await pool.close()


@app.get("/")
async def root():
    return {"status": "ok", "service": "listings-api"}


@app.get("/health")
async def health():
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM listings")
    return {"status": "healthy", "listings_count": count}


@app.get("/api/debug/schema")
async def debug_schema():
    """Temporary: return table columns to debug query errors."""
    async with pool.acquire() as conn:
        listings_cols = await conn.fetch(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'listings' ORDER BY ordinal_position"
        )
        reservations_cols = await conn.fetch(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reservations' ORDER BY ordinal_position"
        )
    return {
        "listings": [{"col": r["column_name"], "type": r["data_type"]} for r in listings_cols],
        "reservations": [{"col": r["column_name"], "type": r["data_type"]} for r in reservations_cols],
    }


@app.get("/api/analytics/listing-performance")
async def listing_performance(
    start_date: date = Query(None),
    end_date: date = Query(None),
    source: str = Query(None),
):
    """
    Returns every listing with address, details, and monthly revenue
    broken down by booking channel.
    """
    # Build the query — join listings with confirmed reservations
    # Group by listing + month + source
    where_clauses = ["r.status = 'confirmed'"]
    params = []
    param_idx = 0

    if start_date:
        param_idx += 1
        where_clauses.append(f"r.check_in >= ${param_idx}")
        params.append(start_date)
    if end_date:
        param_idx += 1
        where_clauses.append(f"r.check_in <= ${param_idx}")
        params.append(end_date)
    if source:
        param_idx += 1
        where_clauses.append(f"r.source = ${param_idx}")
        params.append(source)

    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            l.id,
            l.name,
            l.address,
            l.bedrooms,
            l.bathrooms,
            l.property_type,
            l.active,
            TO_CHAR(r.check_in, 'YYYY-MM') AS month,
            r.source,
            COUNT(*) AS booking_count,
            COALESCE(SUM(r.total_price), 0) AS revenue,
            COALESCE(SUM(r.nights), 0) AS total_nights
        FROM listings l
        LEFT JOIN reservations r ON r.listing_id = l.id AND {where_sql}
        GROUP BY l.id, l.name, l.address, l.bedrooms, l.bathrooms,
                 l.property_type, l.active, month, r.source
        ORDER BY l.name, month, r.source
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    # Aggregate into per-listing structure
    listings_map = {}
    for row in rows:
        lid = row["id"]
        if lid not in listings_map:
            listings_map[lid] = {
                "id": lid,
                "name": row["name"],
                "address": row["address"] or "No address on file",
                "bedrooms": row["bedrooms"],
                "bathrooms": row["bathrooms"],
                "property_type": row["property_type"] or "Unknown",
                "active": row["active"],
                "total_revenue": 0,
                "total_bookings": 0,
                "total_nights": 0,
                "channel_breakdown": defaultdict(lambda: {"revenue": 0, "bookings": 0}),
                "monthly": defaultdict(lambda: defaultdict(lambda: {"revenue": 0, "bookings": 0, "nights": 0})),
            }

        listing = listings_map[lid]
        month = row["month"]
        source = row["source"]
        revenue = int(row["revenue"])
        bookings = int(row["booking_count"])
        nights = int(row["total_nights"])

        # Skip rows where LEFT JOIN produced no reservations
        if month is None:
            continue

        listing["total_revenue"] += revenue
        listing["total_bookings"] += bookings
        listing["total_nights"] += nights
        listing["channel_breakdown"][source]["revenue"] += revenue
        listing["channel_breakdown"][source]["bookings"] += bookings
        listing["monthly"][month][source]["revenue"] += revenue
        listing["monthly"][month][source]["bookings"] += bookings
        listing["monthly"][month][source]["nights"] += nights

    # Convert defaultdicts to regular dicts for JSON serialization
    result = []
    for listing in listings_map.values():
        # Channel breakdown
        channel_list = []
        for src, data in listing["channel_breakdown"].items():
            channel_list.append({
                "source": src,
                "revenue": data["revenue"],
                "bookings": data["bookings"],
            })
        channel_list.sort(key=lambda x: x["revenue"], reverse=True)

        # Monthly breakdown
        monthly_list = []
        for month, sources in sorted(listing["monthly"].items()):
            month_entry = {"month": month, "channels": {}, "total_revenue": 0, "total_bookings": 0, "total_nights": 0}
            for src, data in sources.items():
                month_entry["channels"][src] = data
                month_entry["total_revenue"] += data["revenue"]
                month_entry["total_bookings"] += data["bookings"]
                month_entry["total_nights"] += data["nights"]
            monthly_list.append(month_entry)

        result.append({
            "id": listing["id"],
            "name": listing["name"],
            "address": listing["address"],
            "bedrooms": listing["bedrooms"],
            "bathrooms": listing["bathrooms"],
            "property_type": listing["property_type"],
            "active": listing["active"],
            "total_revenue": listing["total_revenue"],
            "total_bookings": listing["total_bookings"],
            "total_nights": listing["total_nights"],
            "channel_breakdown": channel_list,
            "monthly": monthly_list,
        })

    # Sort by total revenue descending
    result.sort(key=lambda x: x["total_revenue"], reverse=True)

    return {
        "listings": result,
        "total_listings": len(result),
        "listings_with_bookings": sum(1 for l in result if l["total_bookings"] > 0),
    }
