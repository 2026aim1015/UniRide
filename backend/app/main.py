from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import Base, engine
from app import models  # noqa: F401 - register all SQLAlchemy models
from app.ratelimit import RateLimitMiddleware
from app.routers import profiles, bicycles, zones, rides, reports, maintenance, hardware, location_events

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title=settings.app_name, version="2.0.0", lifespan=lifespan)
if settings.rate_limit_per_minute > 0:
    app.add_middleware(RateLimitMiddleware, per_minute=settings.rate_limit_per_minute,
                       write_per_minute=settings.rate_limit_write_per_minute)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "UniRide API", "schema_version": "revised"}

for router in (profiles.router, bicycles.router, zones.router, rides.router, reports.router,
               maintenance.router, hardware.router, location_events.router):
    app.include_router(router, prefix=settings.api_v1_prefix)
