# UniRide database schema notes

This document describes the tables implemented in `app/models.py`.

| Table | Purpose |
|---|---|
| `profiles` | Application profile linked to the same UUID as Supabase Auth; app role/status |
| `parking_zones` | Approved parking areas and radius |
| `bicycles` | QR identifier, current state, zone and last known location |
| `rides` | Student/bicycle ride lifecycle and start/end snapshots |
| `hardware_devices` | One registered controller per bicycle |
| `hardware_commands` | Idempotent command queue and execution status |
| `problem_reports` | Student reports linked to bicycle, reporter, optional ride |
| `maintenance_records` | Maintenance work and optional report/assignee |
| `ride_location_events` | Location samples recorded during a ride |
| `audit_logs` | Actor, action, entity and JSONB details |

## Constraints

- All primary keys use UUID.
- `profiles.id` must equal the UUID returned by Supabase Auth.
- `profiles.role` is `student` or `admin`; `account_status` is `active` or `suspended`.
- Bicycle status: `available`, `reserved`, `in_use`, `maintenance`, `offline`.
- Ride status: `pending_start`, `active`, `pending_end`, `completed`, `cancelled`.
- PostgreSQL partial unique indexes allow at most one unfinished ride per user and per bicycle (`pending_start`, `active`, `pending_end`).
- QR code IDs, roll numbers (when present), hardware device identifiers, hardware-to-bicycle mapping and command idempotency keys are unique.
- Parking zone radius must be positive; hardware battery level, when present, must be between 0 and 100.
- Foreign keys specify deletion behavior to protect historical ride/report records.
