import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.auth import current_profile, require_admin
from app.database import get_db
from app.models import ParkingZone, Profile
from app.schemas import ZoneCreate, ZoneOut

router = APIRouter(prefix="/parking-zones", tags=["parking zones"])

@router.get("", response_model=list[ZoneOut])
def list_zones(include_inactive: bool = False, db: Session = Depends(get_db), _profile: Profile = Depends(current_profile)):
    query = select(ParkingZone)
    if not include_inactive:
        query = query.where(ParkingZone.is_active.is_(True))
    return list(db.scalars(query.order_by(ParkingZone.name)).all())

@router.post("", response_model=ZoneOut, status_code=201)
def create_zone(payload: ZoneCreate, db: Session = Depends(get_db), _admin: Profile = Depends(require_admin)):
    zone = ParkingZone(**payload.model_dump())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone

@router.patch("/{zone_id}", response_model=ZoneOut)
def update_zone(zone_id: uuid.UUID, payload: ZoneCreate, db: Session = Depends(get_db), _admin: Profile = Depends(require_admin)):
    zone = db.get(ParkingZone, zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail="Parking zone not found")
    for key, value in payload.model_dump().items():
        setattr(zone, key, value)
    db.commit()
    db.refresh(zone)
    return zone
