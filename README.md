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

- Docker & Docker Compose
- Guesty API credentials (Client ID & Secret from [Guesty Developer Console](https://developers.guesty.com/))

### 1. Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd guesty-insights-engine

# Copy environment template
cp .env.example .env

# Edit .env and add your Guesty credentials
nano .env
```

### 2. Start with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Access the Dashboard

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 4. Sync Data

Click "Sync Data" in the sidebar or call:

```bash
curl -X POST http://localhost:8000/api/sync/trigger
```

---

## Deploy to Share via URL

### Option 1: Railway (Recommended - Free Tier Available)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. **Create Railway Account**: https://railway.app
2. **New Project** → "Deploy from GitHub repo"
3. **Add PostgreSQL**: Click "New" → "Database" → "PostgreSQL"
4. **Configure Environment Variables**:
   - `GUESTY_CLIENT_ID`: Your Guesty client ID
   - `GUESTY_CLIENT_SECRET`: Your Guesty client secret
   - `DATABASE_URL`: Auto-configured by Railway

5. **Deploy Services**:
   - Backend: Point to `/backend` folder
   - Frontend: Point to `/frontend` folder

6. **Get Your URL**: Railway provides a public URL like `https://your-app.up.railway.app`

### Option 2: Render

1. **Create Render Account**: https://render.com
2. **New Web Service** for backend:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   
3. **New Static Site** for frontend:
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

4. **Add PostgreSQL Database** from Render dashboard

5. **Set Environment Variables** in both services

### Option 3: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy backend
cd backend
fly launch
fly secrets set GUESTY_CLIENT_ID=xxx GUESTY_CLIENT_SECRET=xxx

# Deploy frontend  
cd ../frontend
fly launch
```

### Option 4: Self-Hosted (VPS)

```bash
# On your server (Ubuntu/Debian)
sudo apt update
sudo apt install docker.io docker-compose nginx certbot

# Clone and configure
git clone <repo> /opt/guesty-insights
cd /opt/guesty-insights
cp .env.example .env
nano .env  # Add your credentials

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Set up SSL with Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

---

## Production Docker Compose

Create `docker-compose.prod.yml` for production deployment:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: guesty_insights
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD}@db:5432/guesty_insights
      GUESTY_CLIENT_ID: ${GUESTY_CLIENT_ID}
      GUESTY_CLIENT_SECRET: ${GUESTY_CLIENT_SECRET}
    depends_on:
      - db
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      VITE_API_URL: ${API_URL}
    depends_on:
      - backend
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - frontend
      - backend
    restart: always

volumes:
  postgres_data:
```

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

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend**: Python 3.11, FastAPI, SQLAlchemy
- **Database**: PostgreSQL 15
- **Infrastructure**: Docker, Docker Compose

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GUESTY_CLIENT_ID` | Yes | Guesty OAuth client ID |
| `GUESTY_CLIENT_SECRET` | Yes | Guesty OAuth client secret |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SYNC_LOOKBACK_YEARS` | No | Years of historical data (default: 3) |
| `CORS_ORIGINS` | No | Allowed origins for CORS |

---

## License

MIT
