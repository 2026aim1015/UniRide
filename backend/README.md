# UniRide backend — planned FastAPI integration

The frontend is deliberately isolated behind `frontend/src/services/api.ts`. The next phase should implement a FastAPI REST API and PostgreSQL persistence.

Recommended stack:
- FastAPI
- PostgreSQL
- SQLAlchemy 2
- Alembic migrations
- Pydantic request/response schemas
- JWT or institute-approved authentication
- Role-based authorization for student/admin endpoints

Do not treat the current frontend demo data as a real backend or as authenticated user data. Implement backend validation for bicycle availability and ride start/end so two students cannot start the same bicycle simultaneously.
