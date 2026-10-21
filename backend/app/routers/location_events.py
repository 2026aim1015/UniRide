import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.auth import current_profile
from app.database import get_db
from app.models import Ride, RideLocationEvent, Profile

router = APIRouter(prefix="/rides", tags=["ride location"])

class LocationEventIn(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

class LocationEventOut(BaseModel):
    id: str
    ride_id: str
    latitude: float
    longitude: float
    recorded_at: str

@router.post("/{ride_id}/locations", status_code=201, response_model=LocationEventOut)
def record_location(ride_id: uuid.UUID, payload: LocationEventIn, db: Session = Depends(get_db), profile: Profile = Depends(current_profile)):
    ride = db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.user_id != profile.id and profile.role != "admin":
        raise HTTPException(status_code=403, detail="You cannot add locations to another user's ride")
    if ride.status not in ("pending_start", "active", "pending_end"):
        raise HTTPException(status_code=409, detail="Ride is not active")
    event = RideLocationEvent(ride_id=ride.id, latitude=payload.latitude, longitude=payload.longitude)
    db.add(event)
    db.commit()
    db.refresh(event)
    return LocationEventOut(id=str(event.id), ride_id=str(event.ride_id), latitude=event.latitude, longitude=event.longitude, recorded_at=event.recorded_at.isoformat())
