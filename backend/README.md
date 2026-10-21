# UniRide Backend — Revised Schema

Standalone FastAPI backend aligned to the requested UniRide database design. It does not modify the React frontend. The backend uses PostgreSQL, SQLAlchemy 2, and Supabase Auth for identity validation.

## Included schema

All ten tables are represented in `app/models.py`:
`profiles`, `bicycles`, `parking_zones`, `rides`, `hardware_devices`, `hardware_commands`, `problem_reports`, `maintenance_records`, `ride_location_events`, `audit_logs`.

Includes UUID primary keys, foreign keys, unique QR/device/idempotency identifiers, status/radius/battery checks, timezone-aware timestamps, JSONB metadata/details, ride indexes, and PostgreSQL partial unique indexes preventing multiple unfinished rides per student or bicycle.

## 1. Prerequisites

- Python 3.11+
- PostgreSQL 14+ (or a compatible Supabase Postgres database)
- A Supabase project for Auth
- A Supabase account that has already signed in through the frontend

## 2. Setup

Run these commands from this folder.

### Windows PowerShell

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL` to your PostgreSQL connection string
- `SUPABASE_URL` to your project URL
- `SUPABASE_ANON_KEY` to your Supabase publishable/anon key
- `CORS_ORIGINS` to the frontend origin, normally `http://localhost:5173`
- `AUTO_CREATE_TABLES=true` only for initial local development

Do not use a Supabase service-role key in the frontend. The backend only needs the anon/publishable key to validate the user's bearer token.

### macOS/Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

## 3. Run

```bash
uvicorn app.main:app --reload
```

- Health check: `http://127.0.0.1:8000/health`
- Interactive API docs: `http://127.0.0.1:8000/docs`

The database must exist before connecting. With `AUTO_CREATE_TABLES=true`, SQLAlchemy creates the tables on startup. For a shared/deployed database, use reviewed Alembic migrations instead of relying on `create_all`; migration files are not included in this starter package.

## 4. Authentication

Protected routes expect:

```http
Authorization: Bearer <Supabase access token>
```

The backend verifies the token by calling Supabase Auth `/auth/v1/user`. It creates a `profiles` row from the Supabase user ID if one is missing. New profiles default to `student`. The role is not accepted from profile update requests. Promote a trusted administrator through a controlled SQL/admin process, not from the browser. Suspended profiles are rejected.

The login/signup teammate must use the same Supabase project configured in this backend. After sign-in, the frontend should pass the current Supabase access token to backend calls.

## 5. Endpoints

All routes below are prefixed with `/api/v1`.

| Method | Route | Access |
|---|---|---|
| GET | `/profiles/me` | Signed in |
| PATCH | `/profiles/me` | Signed in; full name/roll number only |
| GET | `/bicycles` | Signed in |
| GET | `/bicycles/{bicycle_id}` | Signed in |
| POST/PATCH | `/bicycles`, `/bicycles/{bicycle_id}` | Admin |
| GET | `/parking-zones` | Signed in |
| POST/PATCH | `/parking-zones`, `/parking-zones/{zone_id}` | Admin |
| GET | `/rides/me` | Signed in |
| GET | `/rides` | Admin |
| POST | `/rides/start` | Signed in |
| POST | `/rides/{ride_id}/end` | Owner or admin |
| POST | `/rides/{ride_id}/locations` | Owner or admin |
| POST | `/reports` | Signed in |
| GET | `/reports/me` | Signed in |
| GET/PATCH | `/reports`, `/reports/{report_id}` | Admin |
| GET/POST | `/maintenance-records` | Admin |
| PATCH | `/maintenance-records/{record_id}` | Admin |
| GET/POST | `/hardware/devices` | Admin |
| GET/POST | `/hardware/commands` | Admin |

## 6. Example requests

Start a ride:

```json
{
  "bicycle_id": "UUID-FROM-GET-BICYCLES",
  "start_latitude": 30.97,
  "start_longitude": 76.47,
  "start_zone_id": "OPTIONAL-ZONE-UUID"
}
```

End a ride:

```json
{
  "end_latitude": 30.97,
  "end_longitude": 76.47,
  "end_zone_id": "OPTIONAL-ZONE-UUID"
}
```

Create a problem report:

```json
{
  "bicycle_id": "UUID-FROM-GET-BICYCLES",
  "ride_id": null,
  "category": "brake_issue",
  "description": "Rear brake is not responding properly"
}
```

## 7. Important integration notes

- `problem_reports` is the database table name; the HTTP route is `/reports` for straightforward frontend integration.
- Starting a ride currently changes the ride to `active` and bicycle to `in_use` in one database transaction. Hardware unlock/lock is **not** integrated; hardware command endpoints only queue database commands and do not communicate with a physical controller.
- Zone validation checks coordinates against the selected zone when both coordinates are supplied. For a production release, require GPS coordinates and an approved zone on ride return, and define location-spoofing protections.
- `AUTO_CREATE_TABLES=true` is for local prototype setup only. There is no Alembic migration history in this package yet.
- Before deployment, add rate limiting, structured logging, production error handling, migration tests, and tests against a real PostgreSQL/Supabase staging project.
- The package has not been tested against your actual Supabase project or deployed database because no project credentials/database were provided.
