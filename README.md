# UniRide

Smart campus bicycle-sharing and mobility management system for IIT Ropar.

**Status:** Under development · **Program:** M.Tech CSE/AI, IIT Ropar

## About

UniRide lets authorized students find available bicycles, scan QR codes, start and end rides, view ride history, and report issues. An admin dashboard manages bicycles, parking zones, rides, and maintenance. The first phase focuses on the software platform, with the design ready for future smart-lock integration.

## Tech Stack

| Component | Technology |
| --- | --- |
| Mobile app | Flutter, Dart |
| Backend API | Python, FastAPI |
| Database | PostgreSQL, SQLAlchemy, Alembic |
| Admin dashboard | React, TypeScript |
| Maps and location | Google Maps, Geolocator |

## Repository Structure

```text
UniRide/
│
├── frontend/                         # React + TypeScript website
│   ├── public/                       # Static assets
│   ├── src/
│   │   ├── components/               # Reusable UI components
│   │   │
│   │   ├── features/                 # Feature-specific frontend code
│   │   │   ├── auth/
│   │   │   │
│   │   │   ├── bicycles/
│   │   │   │
│   │   │   ├── rides/
│   │   │   │
│   │   │   ├── reports/
│   │   │   │
│   │   │   └── admin/
│   │   │
│   │   ├── lib/
│   │   │
│   │   ├── styles/
│   │   │
│   │   ├── App.tsx                   # Application routes and layout
│   │   └── main.tsx                  # Frontend entry point
│   │
│   ├── .env.example                  # Example frontend configuration
│   ├── package.json
│   └── index.html
│
├── backend/                          # FastAPI + Python backend
│   ├── app/
│   │   ├── main.py                   # Backend entry point
│   │   ├── config.py                 # Application configuration
│   │   ├── database.py               # Database connectivity
│   │   │
│   │   ├── api/
│   │   │   └── routes/
│   │   │
│   │   ├── models/                   # Database models
│   │   │
│   │   ├── schemas/                  # Request/response validation
│   │   │
│   │   ├── services/                 # Business logic
│   │   │
│   │   ├── repositories/             # Database query operations
│   │   │
│   │   └── core/
│   │
│   ├── tests/                        # Backend automated tests
│   │
│   ├── alembic/                      # Database migrations
│   ├── .env.example                  # Example backend configuration
│   └── requirements.txt              # Python dependencies
│
├── docs/              
│
├── .gitignore                        # Files excluded from Git
└── README.md                         # Project overview and instructions
```



## Team

- **Kanak** – 2026AIM1009
- **Harshita Mahor** – 2026CSM1016
- **Nishi Verma** – 2026AIM1015

