# Guesty Insights Engine

OTA performance analytics and booking intelligence dashboard for vacation rental operators using Guesty PMS.

![Dashboard Preview](docs/dashboard-preview.png)

## Features

- **OTA Performance Comparison**: Compare ADR, lead time, and length of stay across Airbnb, VRBO, Booking.com, and more
- **Revenue Analytics**: Track revenue trends and distribution by booking source
- **Conversion Funnel**: Measure inquiry-to-booking conversion rates
- **Booking Patterns**: Analyze day-of-week patterns and lead time distribution
- **Cancellation Analysis**: Monitor cancellation rates by channel

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Guesty API credentials (Client ID & Secret from [Guesty Developer Console](https://developers.guesty.com/))

### 1. Clone and Configure

```bash
git clone <your-repo-url>
cd guesty-insights
cp .env.example .env
```

Update `.env` with:
- `DATABASE_URL`
- `GUESTY_CLIENT_ID`
- `GUESTY_CLIENT_SECRET`

### 2. Install and Run

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 3. Access the Dashboard

- **App**: http://localhost:3000
- **API**: http://localhost:3000/api/health

### 4. Sync Data

Click "Sync Data" in the sidebar or call:

```bash
curl -X POST http://localhost:3000/api/sync/trigger
```

---

## Deploy to Share via URL (Railway)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. **Create Railway Project** → "Deploy from GitHub repo"
2. **Add PostgreSQL**: "New" → "Database" → "PostgreSQL"
3. **Set Environment Variables**:
   - `GUESTY_CLIENT_ID`
   - `GUESTY_CLIENT_SECRET`
   - `DATABASE_URL` (from Railway)
4. **Deploy**: Railway builds and serves the Next.js app as a single service
5. **Get Your URL**: `https://your-app.up.railway.app`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/summary` | KPIs with filters |
| GET | `/api/analytics/by-source` | Metrics grouped by OTA |
| GET | `/api/analytics/time-series` | Bookings/revenue over time |
| GET | `/api/analytics/lead-time-distribution` | Lead time histogram |
| GET | `/api/analytics/conversion-funnel` | Inquiry → booking funnel |
| GET | `/api/analytics/day-of-week` | Booking patterns by day |
| GET | `/api/analytics/cancellations` | Cancellation stats |
| POST | `/api/sync/trigger` | Start manual sync |
| GET | `/api/sync/status` | Last sync status |

**All analytics endpoints accept**: `start_date`, `end_date`, `source`, `listing_id`

---

## Development

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

---

## Tech Stack

- **App**: Next.js (App Router), TypeScript
- **Database**: PostgreSQL + Prisma
- **UI**: Tailwind CSS, Recharts

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GUESTY_CLIENT_ID` | Yes | Guesty OAuth client ID |
| `GUESTY_CLIENT_SECRET` | Yes | Guesty OAuth client secret |
| `GUESTY_BASE_URL` | No | Guesty API base URL |
| `GUESTY_TOKEN_URL` | No | Guesty OAuth token URL |
| `SYNC_LOOKBACK_YEARS` | No | Years of historical data (default: 3) |
| `NEXT_PUBLIC_API_URL` | No | Override API base URL for the UI |

---

## License

MIT
