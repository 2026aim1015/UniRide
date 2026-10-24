import math
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.auth import current_profile, require_admin
from app.database import get_db
from app.models import AuditLog, Bicycle, ParkingZone, Ride, Profile
from app.schemas import RideEnd, RideOut, RideStart

router = APIRouter(prefix="/rides", tags=["rides"])
OPEN = ("pending_start", "active", "pending_end")

def distance_m(lat1, lon1, lat2, lon2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*r*math.atan2(math.sqrt(a), math.sqrt(1-a))

def validate_zone(db, zone_id, lat, lon):
    if zone_id is None:
        raise HTTPException(
            status_code=400,
            detail="A parking zone must be selected",
        )

    if lat is None or lon is None:
        raise HTTPException(
            status_code=400,
            detail="GPS coordinates are required",
        )

    zone = db.get(ParkingZone, zone_id)

    if zone is None or not zone.is_active:
        raise HTTPException(
            status_code=400,
            detail="Parking zone does not exist or is inactive",
        )

    if distance_m(lat, lon, zone.latitude, zone.longitude) > zone.radius_meters:
        raise HTTPException(
            status_code=400,
            detail="Coordinates are outside the selected parking zone",
        )

@router.get("/me", response_model=list[RideOut])
def my_rides(db: Session = Depends(get_db), profile: Profile = Depends(current_profile)):
    return list(db.scalars(select(Ride).where(Ride.user_id == profile.id).order_by(Ride.start_time.desc())).all())

@router.get("", response_model=list[RideOut])
def all_rides(db: Session = Depends(get_db), _admin: Profile = Depends(require_admin)):
    return list(db.scalars(select(Ride).order_by(Ride.start_time.desc())).all())

@router.post("/start", response_model=RideOut, status_code=201)
def start_ride(payload: RideStart, db: Session = Depends(get_db), profile: Profile = Depends(current_profile)):
    try:
        bicycle = db.scalar(select(Bicycle).where(Bicycle.id == payload.bicycle_id).with_for_update())
        if bicycle is None:
            raise HTTPException(status_code=404, detail="Bicycle not found")
        if bicycle.status != "available":
            raise HTTPException(status_code=409, detail="Bicycle is not available")
        existing = db.scalar(select(Ride.id).where(Ride.user_id == profile.id, Ride.status.in_(OPEN)).limit(1))
        if existing:
            raise HTTPException(status_code=409, detail="You already have an unfinished ride")
        validate_zone(db, payload.start_zone_id, payload.start_latitude, payload.start_longitude)
        ride = Ride(user_id=profile.id, bicycle_id=bicycle.id, status="active",
                    start_latitude=payload.start_latitude, start_longitude=payload.start_longitude,
                    start_zone_id=payload.start_zone_id)
        bicycle.status = "in_use"
        db.add(ride)
        db.add(AuditLog(actor_id=profile.id, action="ride.started", entity_type="ride", details={"bicycle_id": str(bicycle.id)}))
        db.commit()
        db.refresh(ride)
        return ride
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ride could not be started; another ride may already be active") from exc

@router.post("/{ride_id}/end", response_model=RideOut)
def end_ride(ride_id: uuid.UUID, payload: RideEnd, db: Session = Depends(get_db), profile: Profile = Depends(current_profile)):
    try:
        ride = db.scalar(select(Ride).where(Ride.id == ride_id).with_for_update())
        if ride is None:
            raise HTTPException(status_code=404, detail="Ride not found")
        if ride.user_id != profile.id and profile.role != "admin":
            raise HTTPException(status_code=403, detail="You cannot end another user's ride")
        if ride.status not in OPEN:
            raise HTTPException(status_code=409, detail="Ride is already finished")
        validate_zone(db, payload.end_zone_id, payload.end_latitude, payload.end_longitude)
        bicycle = db.scalar(select(Bicycle).where(Bicycle.id == ride.bicycle_id).with_for_update())
        ride.status = "completed"
        ride.end_time = datetime.now(timezone.utc)
        ride.end_latitude = payload.end_latitude
        ride.end_longitude = payload.end_longitude
        ride.end_zone_id = payload.end_zone_id
        if bicycle:
            bicycle.status = "available"
            bicycle.current_zone_id = payload.end_zone_id or bicycle.current_zone_id
            if payload.end_latitude is not None: bicycle.last_latitude = payload.end_latitude
            if payload.end_longitude is not None: bicycle.last_longitude = payload.end_longitude
            if payload.end_latitude is not None and payload.end_longitude is not None:
                bicycle.last_location_at = datetime.now(timezone.utc)
        db.add(AuditLog(actor_id=profile.id, action="ride.ended", entity_type="ride", entity_id=ride.id))
        db.commit()
        db.refresh(ride)
        return ride
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ride could not be ended") from exc
