# Guesty Insights Engine - Implementation Plan

## Claude Code Execution Model

**Required workflow for all modules:**
1. Enter planning mode (`/plan`) before any implementation
2. Reference relevant Claude skills before coding
3. Complete module implementation
4. Run review agent for validation
5. Execute tests before proceeding

---

## Agent & Subagent Structure

### Context Window Management

Each agent session should stay within ~60% context utilization to leave room for debugging and iteration. Structure work into focused modules that can be completed within a single session.

### Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                    MAIN ORCHESTRATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MODULE 1: Infrastructure ──► REVIEW ──► TEST GATE              │
│       │                                                          │
│       ▼                                                          │
│  MODULE 2: Guesty Client ──► REVIEW ──► TEST GATE               │
│       │                                                          │
│       ▼                                                          │
│  MODULE 3: Data Sync ──► REVIEW ──► TEST GATE                   │
│       │                                                          │
│       ▼                                                          │
│  MODULE 4: Analytics API ──► REVIEW ──► TEST GATE               │
│       │                                                          │
│       ▼                                                          │
│  MODULE 5: Frontend Core ──► REVIEW ──► TEST GATE               │
│       │                                                          │
│       ▼                                                          │
│  MODULE 6: Dashboard Pages ──► REVIEW ──► TEST GATE             │
│       │                                                          │
│       ▼                                                          │
│  MODULE 7: Integration & Polish ──► FINAL REVIEW                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Definitions

### MODULE 1: Infrastructure
**Scope:** Project scaffolding, Docker, database schema

**Tasks:**
- Initialize project structure
- Backend framework setup with type checking and code quality tools
- Frontend framework setup
- Database schema + initial migration (all core tables)
- Docker Compose configuration (PostgreSQL, backend, frontend)
- Environment configuration with validation

**Skills to Reference:**
- Review skill docs if creating any documentation artifacts

**Deliverable:** Development environment runs full stack, database migrated

**Test Gate:**
- [ ] Development environment starts successfully
- [ ] Dependencies install without errors
- [ ] Database migrations create all tables
- [ ] Backend responds on health endpoint
- [ ] Frontend dev server loads

---

### MODULE 2: Guesty API Client
**Scope:** Authentication, HTTP client, type definitions

**Tasks:**
- OAuth 2.0 client credentials implementation
- Token caching with 5-minute expiry buffer
- HTTP client with auth interceptor
- Rate limit handling (exponential backoff on 429)
- Type definitions/models for all Guesty response types
- Source normalization utility

**Skills to Reference:**
- None required

**Deliverable:** Authenticated requests to Guesty API succeed

**Test Gate:**
- [ ] Token acquisition works with valid credentials
- [ ] Token refresh triggers before expiry
- [ ] GET /listings returns data
- [ ] Rate limit backoff logs correctly
- [ ] Source normalization covers known values

---

### MODULE 3: Data Sync Services
**Scope:** Pull and store Guesty data locally

**Tasks:**
- Listings sync service (paginated fetch, upsert)
- Reservations sync service (3-year lookback, calculated fields)
- Conversations sync service (link to reservations)
- Guests sync service (hash PII)
- Sync orchestrator with logging
- Scheduled job configuration (daily 3am)
- Manual sync endpoint

**Skills to Reference:**
- None required

**Deliverable:** Database populated with historical data, sync logs show success

**Test Gate:**
- [ ] Full sync completes without errors
- [ ] Reservations have calculated lead_time_days and nights
- [ ] Sources are normalized in database
- [ ] Guest emails are hashed, not plaintext
- [ ] SyncLog records created with correct counts
- [ ] Manual trigger endpoint works

---

### MODULE 4: Analytics API
**Scope:** Backend endpoints for all metrics

**Tasks:**
- KPI summary endpoint (filterable)
- OTA comparison endpoint (metrics by source)
- Time series endpoint (interval: week/month)
- Lead time distribution endpoint (histogram buckets)
- Conversion funnel endpoint
- Day-of-week patterns endpoint
- Cancellation stats endpoint
- Listings reference endpoint
- Sources reference endpoint

**Skills to Reference:**
- None required

**Deliverable:** All analytics endpoints return correct data

**Test Gate:**
- [ ] Each endpoint returns valid JSON
- [ ] Date filters work correctly
- [ ] Source filter works correctly
- [ ] Listing filter works correctly
- [ ] Empty result sets return gracefully
- [ ] Calculations verified against manual spot-check

---

### MODULE 5: Frontend Core
**Scope:** Layout, shared components, state management

**Tasks:**
- Layout shell (sidebar, header)
- Global filter components (DateRangePicker, SourceSelect, ListingSelect)
- Filter state management
- KPI card component
- Reusable chart components (Bar, Line, Pie, Heatmap)
- API client setup with data fetching
- Loading/error/empty state components

**Skills to Reference:**
- `/mnt/skills/public/frontend-design/SKILL.md` — Review before building UI components

**Deliverable:** Core UI framework renders with filter controls

**Test Gate:**
- [ ] Layout renders without errors
- [ ] Filters update application state
- [ ] Data fetching from backend works
- [ ] Chart components render with mock data
- [ ] Responsive sidebar toggle works

---

### MODULE 6: Dashboard Pages
**Scope:** All analytics views

**Tasks:**
- Dashboard overview page (KPIs + mini charts)
- OTA comparison page (bar charts, comparison tables)
- Revenue breakdown page (pie + trend charts)
- Conversion funnel page (funnel visualization)
- Booking patterns page (heatmap, histograms)
- Wire all pages to live API data

**Skills to Reference:**
- `/mnt/skills/public/frontend-design/SKILL.md` — Reference for chart styling

**Deliverable:** Full dashboard functional with real data

**Test Gate:**
- [ ] All pages load without console errors
- [ ] Data refreshes when filters change
- [ ] Charts render correctly with live data
- [ ] Navigation between pages works
- [ ] Empty states display when no data matches

---

### MODULE 7: Integration & Polish
**Scope:** End-to-end validation, error handling, documentation

**Tasks:**
- Error handling audit (all API calls graceful)
- Performance review (query efficiency, add indexes if needed)
- README documentation
- Environment variable documentation
- Docker production build configuration

**Skills to Reference:**
- `/mnt/skills/public/docx/SKILL.md` — If generating any Word documentation

**Deliverable:** Production-ready deployment

**Test Gate:**
- [ ] Full user flow works end-to-end
- [ ] Guesty API errors handled gracefully in UI
- [ ] Docker production build succeeds
- [ ] README contains setup instructions
- [ ] No console errors or warnings in production build

---

## Review Agent Protocol

After each module, spawn a review subagent with this prompt structure:

```
You are a code review agent. Review the following module for:

1. **Correctness:** Does the code do what it's supposed to?
2. **Error Handling:** Are all failure modes handled?
3. **Type Safety:** Are types properly defined where applicable?
4. **Security:** PII exposure, credential leaks, injection risks?
5. **Performance:** Obvious inefficiencies or missing indexes?
6. **Standards:** Code quality checks passing, consistent formatting?

Module: [MODULE_NAME]
Files to review: [LIST_OF_FILES]

Output a pass/fail assessment with specific issues to fix before proceeding.
```

**Review must pass before proceeding to next module.**

---

## Test Gate Execution

At each test gate, run appropriate tests for your chosen stack:

- Backend tests (unit and integration)
- Frontend component tests (if applicable)
- Database migration verification
- API endpoint validation

---

## Analytics Endpoint Specifications

### GET /api/analytics/summary

Returns high-level KPIs

**Query Parameters:**
- `start_date` (ISO date)
- `end_date` (ISO date)
- `source` (optional)
- `listing_id` (optional)

**Response:**
```json
{
  "total_bookings": 156,
  "total_revenue": 284500,
  "avg_lead_time_days": 45,
  "avg_length_of_stay": 4.2,
  "conversion_rate": 0.34,
  "cancellation_rate": 0.08,
  "top_source": "airbnb"
}
```

---

### GET /api/analytics/by-source

OTA performance breakdown

**Query Parameters:** Same as summary

**Response:**
```json
{
  "sources": [
    {
      "source": "airbnb",
      "bookings": 89,
      "revenue": 156000,
      "avg_lead_time": 42,
      "avg_nights": 4.1
    },
    {
      "source": "vrbo",
      "bookings": 45,
      "revenue": 98000,
      "avg_lead_time": 53,
      "avg_nights": 4.8
    }
  ]
}
```

---

### GET /api/analytics/time-series

Bookings/revenue over time

**Query Parameters:**
- Same as summary
- `interval` (week|month)

**Response:**
```json
{
  "interval": "month",
  "data": [
    {
      "period": "2024-01",
      "bookings": 12,
      "revenue": 23400
    },
    {
      "period": "2024-02",
      "bookings": 18,
      "revenue": 34500
    }
  ]
}
```

---

### GET /api/analytics/lead-time-distribution

Histogram of booking lead times

**Query Parameters:** Same as summary

**Response:**
```json
{
  "buckets": [
    { "range": "0-7", "count": 15 },
    { "range": "8-14", "count": 22 },
    { "range": "15-30", "count": 45 },
    { "range": "31-60", "count": 38 },
    { "range": "61-90", "count": 21 },
    { "range": "90+", "count": 15 }
  ]
}
```

---

### GET /api/analytics/conversion-funnel

Inquiry to booking conversion

**Query Parameters:** Same as summary

**Response:**
```json
{
  "stages": [
    { "stage": "inquiries", "count": 340 },
    { "stage": "quotes_sent", "count": 210 },
    { "stage": "bookings", "count": 115 }
  ],
  "conversion_rate": 0.338
}
```

---

### GET /api/analytics/day-of-week

Booking patterns by day

**Query Parameters:** Same as summary

**Response:**
```json
{
  "days": [
    { "day": "monday", "bookings": 18 },
    { "day": "tuesday", "bookings": 12 },
    { "day": "wednesday", "bookings": 22 },
    { "day": "thursday", "bookings": 15 },
    { "day": "friday", "bookings": 31 },
    { "day": "saturday", "bookings": 28 },
    { "day": "sunday", "bookings": 30 }
  ]
}
```

---

### GET /api/analytics/cancellations

Cancellation statistics

**Query Parameters:** Same as summary

**Response:**
```json
{
  "total_bookings": 156,
  "total_cancellations": 12,
  "cancellation_rate": 0.077,
  "by_source": [
    { "source": "airbnb", "cancellations": 7, "rate": 0.079 },
    { "source": "vrbo", "cancellations": 3, "rate": 0.067 }
  ],
  "avg_days_before_checkin": 18
}
```

---

### GET /api/analytics/listings

Reference list of listings

**Response:**
```json
{
  "listings": [
    { "id": "uuid", "guesty_id": "123", "name": "Beachfront Condo" },
    { "id": "uuid", "guesty_id": "456", "name": "Downtown Loft" }
  ]
}
```

---

### GET /api/analytics/sources

Reference list of booking sources

**Response:**
```json
{
  "sources": ["airbnb", "vrbo", "booking", "expedia", "direct"]
}
```

---

## Database Schema Design

**Core Tables:** 
- `listings` - Property catalog from Guesty
- `guests` - Guest records (PII hashed)
- `reservations` - Booking data with calculated fields
- `conversations` - Inquiry/message threads
- `sync_logs` - Sync execution history

**Key Relationships:**
- Reservation → Listing (many-to-one)
- Reservation → Guest (many-to-one, nullable)
- Conversation → Listing (many-to-one, nullable)
- Conversation → Reservation (one-to-one, nullable)

**Required Indexes:**
- `reservations.source`
- `reservations.check_in`
- `reservations.booked_at`
- `reservations.status`
- `conversations.source`
- `conversations.converted_to_booking`

**Calculated Fields (stored):**
- `reservations.lead_time_days` = check_in - booked_at
- `reservations.nights` = check_out - check_in

**Data Types:**
- Money: Store as integers (cents) not floats
- Dates: Use timezone-aware timestamps
- Guesty IDs: String type, indexed for lookups

---

## Environment Variables

**Required:**
```
GUESTY_CLIENT_ID=         # From Guesty developer console
GUESTY_CLIENT_SECRET=     # From Guesty developer console
DATABASE_URL=             # PostgreSQL connection string
```

**Optional:**
```
# Sync Configuration
SYNC_LOOKBACK_YEARS=3
SYNC_CRON_SCHEDULE="0 3 * * *"

# API Configuration
API_PORT=3001
```

---

## Guesty API Integration Details

### Authentication Implementation

**OAuth 2.0 Flow:**
1. POST to `https://open-api.guesty.com/oauth2/token`
2. Body: `grant_type=client_credentials&client_id=X&client_secret=Y&scope=open-api`
3. Response contains `access_token` and `expires_in` (typically 86400 seconds)
4. Cache token with 5-minute expiry buffer
5. Maximum 5 token requests per API key per 24-hour period

**Token Management:**
- Cache token in memory or Redis
- Refresh token 5 minutes before expiry
- Handle 401 responses by refreshing token and retrying

---

### Pagination Pattern

All Guesty list endpoints use skip/limit pagination:

**Pattern:**
1. Start with `skip=0`, `limit=100`
2. Fetch results
3. If results.length < limit, done
4. Otherwise, increment skip by limit and repeat
5. Add small delay (100ms) between requests for rate limit protection

**Example Query:**
```
GET /reservations?skip=0&limit=100&filters=[{"field":"checkIn","operator":"$gte","value":"2023-01-01T00:00:00Z"}]
```

---

### Source Normalization

Guesty returns inconsistent source values. Normalize them:

**Normalization Map:**
```
'airbnb', 'airbnb2', 'Airbnb' → 'airbnb'
'homeaway', 'vrbo', 'HomeAway' → 'vrbo'
'booking.com', 'Booking.com' → 'booking'
'expedia' → 'expedia'
'manual', 'website', 'direct' → 'direct'
```

**Strategy:**
- Maintain a source mapping configuration
- Normalize during sync, not at query time
- Log unknown sources for manual review
- Update map iteratively as new sources appear

---

### Rate Limit Handling

**Strategy:**
- Implement exponential backoff on 429 responses
- Start with 1 second delay, double on each retry
- Maximum 5 retry attempts
- Add 100ms base delay between paginated requests
- Log all rate limit encounters

**Recommended Delays:**
- Between pages: 100ms
- After 429 (attempt 1): 1 second
- After 429 (attempt 2): 2 seconds
- After 429 (attempt 3): 4 seconds
- After 429 (attempt 4): 8 seconds
- After 429 (attempt 5): 16 seconds

---

## Testing Approach

### Backend
- Unit tests for analytics calculations
- Integration tests for sync services with mocked Guesty responses
- No E2E for V1—manual testing sufficient for internal tool

### Frontend
- Component tests for chart rendering
- No E2E for V1

### Manual Test Checklist
- [ ] Initial sync completes without errors
- [ ] All KPIs calculate correctly for known date range
- [ ] Filters update all charts
- [ ] Empty state displays when no data matches filters
- [ ] Sync can be triggered manually
- [ ] App recovers gracefully from Guesty rate limits

---

## Handoff Protocol

When completing a module session:
1. Read CLAUDE.md first
2. Check current state of relevant files
3. Run existing tests before changes
4. Document any blockers for next session
5. Update CLAUDE.md with progress

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Guesty API rate limits | Medium | High | Batch requests, cache aggressively, run sync overnight |
| Source normalization misses | High | Low | Log unknown sources, add to map iteratively |
| Large data volumes slow queries | Medium | Medium | Add DB indexes, limit default date ranges |
| Guesty API changes | Low | High | Version lock API calls, monitor Guesty changelog |

---

## Success Criteria Checklist

- [ ] Sync pulls 3 years of data in < 1 hour
- [ ] Dashboard loads in < 2 seconds
- [ ] All 7 core KPIs display correctly
- [ ] OTA comparison shows at least 3 distinct sources
- [ ] Date range filter works globally
- [ ] Conversion funnel shows conversation → booking path
- [ ] Day-of-week patterns visualized
- [ ] Lead time distribution renders histogram
