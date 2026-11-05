# UniRide

Campus bicycle-sharing web app for IIT Ropar. Students find a bicycle, scan its QR code, ride with GPS tracking, and park inside a designated zone. Admins manage the fleet, parking zones, rides, maintenance and problem reports.

- **Frontend:** React + TypeScript + Vite (`frontend/`)
- **Backend:** FastAPI + SQLAlchemy + Alembic (`backend/`)
- **Auth and database:** Supabase (Auth + PostgreSQL)

## Features

**Students**
- Sign up, log in, reset password
- Browse and search bicycles; filter by status
- Scan a bicycle's QR code (permanent ID `UR-BIKE-XXXXXXXX`)
- Start and end rides, with GPS and parking-zone (geofence) checks
- Live distance and route while riding; an unfinished ride is restored after a page refresh
- Cancel a ride that cannot be ended normally
- Ride history with route view and CSV export
- Live campus map with parking zones and bicycle availability (auto-refreshes)
- Report bicycle problems

**Admins**
- Dashboard counts taken from the database
- Bicycle management: add, edit, deactivate/reactivate, delete (only without history)
- Parking-zone management: add, edit, activate/deactivate, delete (only if unused)
- Ride records with status, date, zone and search filters; cancel stuck rides
- Maintenance: create from a report, assign, start, complete or cancel (completing resolves the linked report)
- Problem reports: change status, send to maintenance

## Project structure

```
backend/    FastAPI app, Alembic migrations, SQL scripts, tests, Dockerfile
frontend/   React app
docs/       API contract and deployment guide
```

## Run locally

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY
alembic upgrade head        # creates the tables
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs  ·  Health check: http://localhost:8000/health

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # fill in the Supabase values and VITE_API_BASE_URL
npm run dev
```
Open http://localhost:5173. Camera (QR) and GPS need `localhost` or HTTPS.

### First admin
Sign up normally, then run `backend/scripts/promote_admin.sql` in the Supabase SQL editor with your account.

## Environment variables

**Backend (`backend/.env`)**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Used to validate login tokens |
| `CORS_ORIGINS` | Allowed frontend URL(s), comma separated |
| `AUTO_CREATE_TABLES` | Keep `false`; tables are managed by Alembic |
| `RATE_LIMIT_PER_MINUTE` / `RATE_LIMIT_WRITE_PER_MINUTE` | Per-client limits (default 240 / 60; `0` disables) |

**Frontend (`frontend/.env.local`)**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`, optional `VITE_ALLOWED_EMAIL_DOMAIN`.

## Database migrations (Alembic)

- New empty database: `alembic upgrade head`
- Database whose tables already exist: `alembic stamp head`
- After changing `app/models.py`: `alembic revision --autogenerate -m "describe change"`, review the file, then `alembic upgrade head`

Row Level Security: run `backend/scripts/enable_rls.sql`, then check it with `backend/scripts/verify_rls.sql` (all tables RLS on, no policies, all counts 0).

## Testing

```bash
cd backend
pip install -r requirements-dev.txt
TEST_DATABASE_URL=postgresql+psycopg://user:pass@localhost/uniride_test pytest -q
```
The API tests need a real PostgreSQL database and **wipe it first**; never point them at real data. Without `TEST_DATABASE_URL`, only the rate-limit tests run. They cover roles and permissions, the ride lifecycle, simultaneous ride starts, maintenance/status rules and delete rules.

Manual check before release, on a phone:
1. **Student:** log in → find a bicycle → scan QR → start ride → GPS distance/route → park in a zone → end ride → ride history.
2. **Admin:** log in → dashboard → bicycles → parking zones → rides → maintenance → problem reports.

## Testing GPS on a computer

Chrome DevTools → More tools → Sensors → Location → Other…, then enter coordinates **inside an active parking zone** (copy them from Admin → Parking zones) and reload. If a ride cannot be ended, use "Can't end the ride? Cancel it" on the ride page, or an admin can cancel it from the Rides page.

## Deployment

See `docs/DEPLOYMENT.md` (Docker backend, static frontend host, HTTPS, Supabase redirect URLs).

## Known limits

- The rate limiter is in-memory and per process; use a shared store such as Redis for multiple workers.
- Ride history makes one extra request per ride to calculate distance.
- A feature counts as finished only after it has been verified with real database records.
