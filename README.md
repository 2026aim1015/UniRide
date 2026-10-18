# UniRide — Campus Bicycle Sharing Website

A fresh, responsive React + TypeScript + Vite frontend for the UniRide campus bicycle-sharing project. The UI uses a welcoming dark-forest-green, white, and soft-sage palette inspired by the approved reference.

## Current scope
- Responsive landing page
- Student dashboard
- Bicycle discovery with search and status filters
- Bicycle detail modal
- Active ride screen with demo timer and end-ride confirmation
- Ride history
- Report-a-problem form
- Admin dashboard with fleet stats, bicycle management table, and recent reports
- Student/Admin mode switch for preview
- Central API service layer with a demo adapter now and a FastAPI adapter path ready for later integration

## Important status
This is a frontend starter. It currently runs on local demo data so it can be reviewed before the backend is connected. It does **not** claim to provide real authentication, persistent rides, real GPS, QR camera access, or live backend data yet.

## Run on Windows
1. Install Node.js LTS (Node 22 or newer recommended).
2. Extract this ZIP.
3. Open PowerShell in the `UniRide_Frontend_Starter` folder.
4. Run:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

5. Open the local URL printed by Vite.

If your terminal is already inside `frontend`, do not run `cd frontend` again.

## Connect the backend later
The frontend reads `VITE_API_BASE_URL` from `frontend/.env`. The default is `http://localhost:8000/api/v1`.

When a FastAPI backend is ready:
1. Create `frontend/.env` from `.env.example`.
2. Set `VITE_USE_DEMO_DATA=false`.
3. Start FastAPI at the configured URL.
4. Implement the endpoints listed in `docs/API_CONTRACT.md`.

For now, `VITE_USE_DEMO_DATA=true` keeps the app usable without a backend.

## Project structure
```text
UniRide_Frontend_Starter/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── data/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   └── README.md
└── docs/
    └── API_CONTRACT.md
```
