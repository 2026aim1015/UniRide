# UniRide API contract (frontend integration plan)

Base URL: `/api/v1`

The frontend talks to the live FastAPI backend. New endpoints: `GET /profiles` (admin), `GET /rides/me/active`.

## Bicycles
- `GET /bicycles` — return an array of bicycles.
- `GET /bicycles/{bicycle_id}` — return bicycle details.
- `POST /bicycles` — admin creates a bicycle.
- `PATCH /bicycles/{bicycle_id}` — admin updates status/location/details.

Example response:
```json
{
  "id": "B-001",
  "label": "Campus Cruiser",
  "location": "Central Library",
  "distance": "2 min walk",
  "status": "Available",
  "lastServiced": "2026-10-12",
  "color": "#e0f1e8"
}
```

## Rides
- `POST /rides/start` — body `{ "bicycle_id": "B-001" }`.
- `POST /rides/{ride_id}/end` — end an active ride after parking checks.
- `GET /rides/me` — rides belonging to the signed-in student.
- `GET /rides` — admin ride records.

The backend must atomically check availability before starting a ride and validate ride ownership before ending it.

## Reports
- `POST /reports` — body `{ "bicycle_id": "B-108", "issue_type": "Flat tyre", "description": "..." }`.
- `GET /reports` — admin list of reports.
- `PATCH /reports/{report_id}` — admin updates status.

## Authentication (not implemented in current frontend)
- `POST /auth/login`
- `POST /auth/logout` (if using server-managed sessions)
- `GET /auth/me`

Protect student data and enforce student/admin permissions server-side. A frontend role switch is only a design preview, not security.
