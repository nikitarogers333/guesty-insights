# CLAUDE.md - Guesty Insights Engine

## Project Overview
Analytics dashboard for vacation rental operators. Pulls reservation and conversation data from Guesty PMS, stores locally, and surfaces OTA performance insights not available in native Guesty reporting.

**Status:** Complete  
**Stack:** Modern frontend framework + PHP or Python + PostgreSQL

---

## ⚠️ REQUIRED WORKFLOW

**Every module MUST follow this sequence:**

```
1. PLAN    → Enter /plan mode, define approach
2. SKILL   → Read relevant skill docs (see below)
3. BUILD   → Implement the module
4. REVIEW  → Spawn review agent for validation
5. TEST    → Run test gate, all must pass
6. LOG     → Update progress log before proceeding
```

**Do not skip steps. Do not proceed to next module until review passes.**

---

## Skills Reference

Before coding, check if these skills apply:

| Work Type | Skill Path | When to Use |
|-----------|------------|-------------|
| Frontend UI | `/mnt/skills/public/frontend-design/SKILL.md` | Building UI components, charts, layouts |
| Word Docs | `/mnt/skills/public/docx/SKILL.md` | Generating documentation artifacts |
| Spreadsheets | `/mnt/skills/public/xlsx/SKILL.md` | If exporting data to Excel |
| PDFs | `/mnt/skills/public/pdf/SKILL.md` | If generating PDF reports |

**Read the skill doc BEFORE writing any code for that type of work.**

---

## Module Execution Order

| # | Module | Scope | Test Gate |
|---|--------|-------|-----------|
| 1 | Infrastructure | Project structure, Docker, database schema | Development environment starts successfully |
| 2 | Guesty Client | OAuth, HTTP client, types/models | Authenticated API calls succeed |
| 3 | Data Sync | Sync services, scheduled jobs | Database populated, logs clean |
| 4 | Analytics API | All /api/analytics/* endpoints | Endpoints return correct data |
| 5 | Frontend Core | Layout, filters, chart components | UI framework renders |
| 6 | Dashboard Pages | All analytics views | Full dashboard functional |
| 7 | Integration | Polish, error handling, docs | E2E flow works |

**Complete modules sequentially. No skipping ahead.**

---

## Review Agent Template

After completing each module, spawn a review with:

```
Review MODULE [N]: [NAME]

Check for:
1. Correctness - Does it work?
2. Error handling - All failures caught?
3. Type safety - Appropriate type checking?
4. Security - PII exposure, credential leaks?
5. Performance - Inefficiencies?
6. Standards - Code quality checks passing?

Files: [list files created/modified]

Output: PASS or FAIL with specific fixes required.
```

---

## Architecture

**High-Level Data Flow:**
```
Frontend → Backend API (REST) → PostgreSQL
                              ↓
                     Guesty Open API (scheduled sync)
```

**Key Components:**
1. Scheduled job syncs reservations, listings, conversations from Guesty
2. Data stored in PostgreSQL with calculated fields (lead_time, nights, normalized source)
3. Analytics endpoints aggregate data for dashboard consumption
4. Frontend renders charts with visualization library

---

## Guesty API Notes

**Base URL:** `https://open-api.guesty.com/v1`  
**Auth:** OAuth 2.0 client credentials → `https://open-api.guesty.com/oauth2/token`  
**Token TTL:** 24 hours (cache it, max 5 token requests/day)

**Key Endpoints:**
- `GET /reservations` - Booking data (paginated, use skip/limit)
- `GET /listings` - Property catalog
- `GET /communication/conversations` - Inquiry/message threads
- `GET /guests` - Guest records

**Rate Limits:** Implement exponential backoff on 429. Add delay between paginated requests.

**Source Normalization Required:** Guesty returns inconsistent source values (airbnb, Airbnb, airbnb2). Normalize in sync service.

---

## Database Schema

**Core Tables:** `listings`, `guests`, `reservations`, `conversations`, `sync_logs`

**Key Indexes:** 
- `reservations.source`
- `reservations.check_in`
- `reservations.booked_at`
- `reservations.status`

**Calculated Fields:** 
- `lead_time_days` (check_in - booked_at)
- `nights` (check_out - check_in)

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/analytics/summary | KPIs with filters |
| GET | /api/analytics/by-source | Metrics grouped by OTA |
| GET | /api/analytics/time-series | Bookings/revenue over time |
| GET | /api/analytics/lead-time-distribution | Histogram data |
| GET | /api/analytics/conversion-funnel | Inquiry → booking |
| GET | /api/analytics/day-of-week | Booking patterns |
| GET | /api/analytics/cancellations | Cancellation stats |
| POST | /api/sync/trigger | Start manual sync |
| GET | /api/sync/status | Last sync info |

All analytics endpoints accept query params: `start_date`, `end_date`, `source`, `listing_id`

---

## Current Module

**MODULE 1: Infrastructure**
- [ ] Initialize project structure
- [ ] Backend framework setup
- [ ] Frontend framework setup
- [ ] Database schema definition
- [ ] Docker Compose configuration (if using)
- [ ] Environment configuration

---

## Coding Standards

**General:**
- Strong type safety where applicable (type hints for Python, strict types for PHP, TypeScript if used)
- No loose types - define models/interfaces for all Guesty responses
- Input validation on all API boundaries
- Structured logging with appropriate log levels
- Async/await patterns (or equivalent) over callbacks
- Database queries via ORM, raw SQL only for complex aggregations

**Backend Specific:**
- Use framework-appropriate validation (Pydantic, Laravel Validation, etc.)
- Implement proper error handling and HTTP status codes
- Follow REST conventions
- Use dependency injection where applicable

**Frontend Specific:**
- Component-based architecture
- Appropriate state management for chosen framework
- Proper loading and error states
- Responsive design
- Accessibility considerations

---

## Known Gotchas

1. **Guesty source values inconsistent** - Always normalize through SOURCE_MAP
2. **Token refresh** - Cache token, refresh before expiry
3. **Pagination** - Guesty uses skip/limit, not cursors. Always loop until results < limit
4. **Guest PII** - Only store hashed email, no names
5. **Money values** - Guesty returns floats, store as cents (integers)

---

## Progress Log

_Update after each module completion_

| Module | Status | Review | Notes |
|--------|--------|--------|-------|
| 1. Infrastructure | Complete | PASS | FastAPI + React + PostgreSQL + Docker |
| 2. Guesty Client | Complete | PASS | OAuth 2.0, rate limiting, source normalization |
| 3. Data Sync | Complete | PASS | Full sync with PII hashing, calculated fields |
| 4. Analytics API | Complete | PASS | All 9 endpoints implemented |
| 5. Frontend Core | Complete | PASS | Layout, filters, charts, state management |
| 6. Dashboard Pages | Complete | PASS | 5 pages with live data integration |
| 7. Integration | Complete | PASS | Docker prod configs, Railway/Render deploy files |
