# UniRide bicycle ID and QR-code handoff

## Permanent bicycle identifier

When an admin creates a bicycle without supplying `qr_code_id`, the backend generates a permanent code in this format:

`UR-BIKE-XXXXXXXX`

The code is stored in the existing `bicycles.qr_code_id` column. Existing bicycle codes are not changed. The database's unique constraint prevents two bicycles from sharing a code.

The database UUID (`bicycles.id`) remains the internal primary key used by rides and reports. Do not print or encode that UUID as the public bicycle code.

## QR generator contract

For each bicycle, fetch the `qr_code_id` from `GET /api/v1/bicycles` (authenticated) or use the ID displayed in Admin > Bicycle management.

Encode the exact `qr_code_id` string as the QR payload. Example:

- Bicycle name: `UniRide Bicycle 01`
- QR payload: `UR-BIKE-8A1B2C3D`

Do not encode the display name, database UUID, or a separately invented ID. Do not add a URL prefix unless the student scanner is deliberately changed to parse URLs.

## Student website

- Manual search: the bicycle list search matches the permanent `qr_code_id`, bicycle name, database ID, and location.
- QR scan: the existing website scanner reads the payload and matches it against `qr_code_id`.
- Both methods open the same bicycle details and ride-start flow.
- The ride API continues to receive the database UUID (`bicycles.id`) as `bicycle_id`, not the printed public code.

## API endpoints

- `POST /api/v1/bicycles`: admin creates a bicycle; `qr_code_id` is optional and auto-generated when omitted.
- `GET /api/v1/bicycles`: authenticated list, includes `qr_code_id`.
- `GET /api/v1/bicycles/by-code/{qr_code_id}`: authenticated lookup by public code.
- `PATCH /api/v1/bicycles/{bicycle_id}`: admin updates name, status, or parking zone.

The `by-code` lookup route is registered before the UUID route to avoid route matching ambiguity.
