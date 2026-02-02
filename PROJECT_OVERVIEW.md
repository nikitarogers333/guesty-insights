# Guesty Insights Engine - Project Overview

## Executive Summary

**Project Name:** Guesty Insights Engine (GIE)  
**One-liner:** OTA performance analytics and booking intelligence derived from Guesty PMS data  
**Complexity:** Medium  

**Business Value:** Surface actionable insights from reservation and conversation data to optimize channel mix, pricing strategy, and inquiry conversion—intelligence not available in Guesty's native reporting.

**Success Metrics:**
- Time-to-insight: < 5 clicks from dashboard to any metric
- Data freshness: < 24 hours from Guesty
- Load time: < 2s for any dashboard view

---

## Requirements Analysis

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F1 | Compare booking metrics (ADR, LOS, lead time) across OTAs | Must |
| F2 | Visualize revenue distribution by booking source | Must |
| F3 | Track inquiry-to-booking conversion by channel | Must |
| F4 | Filter all metrics by date range, property, OTA | Must |
| F5 | Display booking velocity trends (bookings/week over time) | Should |
| F6 | Show day-of-week booking patterns by OTA | Should |
| F7 | Cancellation rate analysis by source | Should |
| F8 | Guest communication response time metrics | Could |

### Non-Functional Requirements

- Daily batch sync with Guesty (overnight job)
- Support 3 years historical data (~10k-50k reservations typical)
- Single-tenant deployment (one operator)
- No PII exposure in dashboards (aggregated metrics only)

### User Personas

**Primary:** Portfolio Manager / Owner  
- Needs: High-level channel performance, revenue optimization signals  
- Usage: Weekly review, monthly strategic planning

**Secondary:** Revenue Manager  
- Needs: Granular booking patterns, pricing signals  
- Usage: Daily monitoring, A/B test analysis

### Guesty Integration Touchpoints

| Data Domain | Endpoint | Sync Frequency |
|-------------|----------|----------------|
| Reservations | `GET /reservations` | Daily |
| Listings | `GET /listings` | Daily |
| Conversations | `GET /communication/conversations` | Daily |
| Guests | `GET /guests` | Daily |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│   Modern framework + charting library                        │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│   │Dashboard│ │OTA Comp │ │Revenue  │ │Conversion│          │
│   │Overview │ │Analysis │ │Breakdown│ │Funnel   │          │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│   PHP or Python + REST framework                            │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│   │Analytics │ │Sync      │ │Health    │                   │
│   │Endpoints │ │Service   │ │Endpoints │                   │
│   └──────────┘ └──────────┘ └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│   PostgreSQL + ORM                                          │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│   │reserva-  │ │listings  │ │conversa- │ │sync_logs │     │
│   │tions     │ │          │ │tions     │ │          │     │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Guesty Open API                          │
│   OAuth 2.0 | Rate Limited | REST                          │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Component Structure

```
src/
├── components/
│   ├── charts/           # Reusable chart components
│   ├── filters/          # Date range, OTA, property selectors
│   ├── kpi/              # KPI card components
│   └── layout/           # Shell, navigation, sidebar
├── pages/
│   ├── Dashboard         # Overview with key KPIs
│   ├── OTAComparison     # Channel performance deep-dive
│   ├── Revenue           # Revenue breakdown views
│   └── Conversion        # Inquiry funnel analysis
├── hooks/
│   ├── useAnalytics      # Data fetching hooks for API
│   └── useFilters        # Global filter state management
└── api/
    └── client            # API client configuration
```

### Backend Service Architecture

```
src/
├── routes/
│   ├── analytics         # All analytics endpoints
│   ├── sync              # Manual sync triggers
│   └── health            # Health checks
├── services/
│   ├── guesty/           # Guesty API client + auth
│   ├── sync/             # Data sync orchestration
│   └── analytics/        # Metric calculation logic
├── jobs/
│   └── dailySync         # Scheduled job for nightly sync
└── database/
    ├── schema/           # Database schema definitions
    └── migrations/       # Database migrations
```

---

## Data Model

### Core Entities

```
┌──────────────┐       ┌──────────────┐
│   Listing    │       │    Guest     │
├──────────────┤       ├──────────────┤
│ guesty_id    │       │ guesty_id    │
│ name         │       │ email_hash   │
│ bedrooms     │       │ created_at   │
│ property_type│       └──────────────┘
│ active       │              │
└──────────────┘              │
       │                      │
       │    ┌─────────────────┘
       │    │
       ▼    ▼
┌──────────────────────────────────┐
│          Reservation             │
├──────────────────────────────────┤
│ guesty_id (PK)                   │
│ listing_id (FK)                  │
│ guest_id (FK)                    │
│ source (OTA identifier)          │
│ status                           │
│ check_in                         │
│ check_out                        │
│ nights                           │
│ total_price                      │
│ booked_at                        │
│ lead_time_days (calculated)      │
│ created_at                       │
│ updated_at                       │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│         Conversation             │
├──────────────────────────────────┤
│ guesty_id (PK)                   │
│ guest_id (FK)                    │
│ listing_id (FK)                  │
│ source                           │
│ converted_to_booking (bool)      │
│ reservation_id (FK, nullable)    │
│ first_message_at                 │
│ message_count                    │
│ created_at                       │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│          SyncLog                 │
├──────────────────────────────────┤
│ id                               │
│ entity_type                      │
│ records_synced                   │
│ started_at                       │
│ completed_at                     │
│ status                           │
│ error_message                    │
└──────────────────────────────────┘
```

### Guesty Data Mapping

| Guesty Field | Local Field | Transformation |
|--------------|-------------|----------------|
| `_id` | `guesty_id` | Direct |
| `source` | `source` | Normalize (airbnb, vrbo, etc) |
| `money.totalPrice` | `total_price` | Convert to cents |
| `checkIn` | `check_in` | Parse to date |
| `createdAt` | `booked_at` | Parse to timestamp |
| - | `lead_time_days` | `check_in - booked_at` |
| - | `nights` | `check_out - check_in` |

---

## V1 Feature Scope

### Core KPIs (Dashboard Overview)

| KPI | Calculation | Groupable By |
|-----|-------------|--------------|
| Total Revenue | SUM(total_price) | OTA, Property, Month |
| ADR (Avg Daily Rate) | SUM(total_price) / SUM(nights) | OTA, Property |
| Average LOS | AVG(nights) | OTA, Property |
| Avg Lead Time | AVG(lead_time_days) | OTA |
| Booking Count | COUNT(reservations) | OTA, Property, Month |
| Cancellation Rate | cancelled / total | OTA |
| Inquiry Conversion | bookings / conversations | OTA |

### Analytics Views

**1. OTA Performance Comparison**
- Side-by-side bar charts: ADR, LOS, Lead Time by OTA
- Revenue pie chart by source
- Trend lines for each OTA over time

**2. Booking Velocity**
- Bookings per week over trailing 12 months
- Compare current year vs prior year
- Highlight seasonality patterns

**3. Day-of-Week Patterns**
- Heatmap: Which days do bookings come in by OTA
- Insight: "Airbnb bookings peak Sunday, VRBO peaks Tuesday"

**4. Lead Time Distribution**
- Histogram of booking lead times
- Segment by OTA to show behavioral differences
- Insight: "Direct bookings average 45 days out, Airbnb averages 21"

**5. Inquiry Conversion Funnel**
- Conversations → Quotes → Bookings by OTA
- Identify high-intent vs low-intent channels

**6. Cancellation Analysis**
- Cancellation rate by OTA
- Time-to-cancellation distribution
- Revenue impact of cancellations

### Low-Hanging Fruit Beyond Standard Guesty Analytics

These are insights Guesty doesn't surface natively:

1. **Booking Source Mix Shift** - How has your OTA mix changed quarter-over-quarter?
2. **Lead Time Trends** - Are guests booking further out or last-minute? Trending?
3. **LOS by Season** - Do summer guests stay longer than winter guests? By OTA?
4. **Repeat Guest Rate by OTA** - Which channels bring back guests?
5. **Inquiry Response Impact** - Correlation between response time and conversion
6. **Booking Day Patterns** - Optimize your pricing updates timing
7. **Revenue per Available Night** - RevPAN by channel (occupancy-adjusted)

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Guesty API credentials | Environment variables, never in code |
| Guest PII | Store only hashed email, no names in analytics |
| Database access | Local network only, no public exposure |
| API authentication | JWT for frontend-backend (future multi-user) |
| Rate limits | Respect Guesty limits, exponential backoff |

---

## Implementation Considerations

| Layer | Consideration | Notes |
|-------|---------------|-------|
| Charts | Visualization library | Choose library appropriate for chosen frontend framework |
| Date handling | Date/time library | Select appropriate library for backend language |
| HTTP client | API client | Use framework-recommended or popular HTTP client |
| Job scheduling | Scheduled tasks | Use cron, framework scheduler, or similar |
| Deployment | Containerization | Docker Compose recommended for portability |

---

## Out of Scope for V1

- Real-time webhooks (daily batch sufficient)
- Multi-tenant / user management
- Custom report builder
- Export to Excel/PDF
- Mobile-responsive design (desktop-first)
- Predictive analytics / ML
- Direct booking channel tracking (requires separate integration)
