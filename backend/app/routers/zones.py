import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.auth import current_profile, require_admin
from app.database import get_db
from app.models import AuditLog, ParkingZone, Profile, Ride
from app.schemas import ZoneCreate, ZoneOut, ZoneUpdate

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
def update_zone(zone_id: uuid.UUID, payload: ZoneUpdate, db: Session = Depends(get_db), _admin: Profile = Depends(require_admin)):
    zone = db.get(ParkingZone, zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail="Parking zone not found")
    # Only change the fields the client actually sent (partial update).
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is None:
            raise HTTPException(status_code=422, detail=f"'{key}' cannot be null")
        setattr(zone, key, value)
    db.commit()
    db.refresh(zone)
    return zone

@router.delete("/{zone_id}", status_code=204)
def delete_zone(zone_id: uuid.UUID, db: Session = Depends(get_db), admin: Profile = Depends(require_admin)):
    zone = db.get(ParkingZone, zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail="Parking zone not found")
    # Rides keep their zone for history, so a zone that was used cannot be deleted.
    used = db.scalar(
        select(Ride.id).where((Ride.start_zone_id == zone_id) | (Ride.end_zone_id == zone_id)).limit(1)
    )
    if used:
        raise HTTPException(
            status_code=409,
            detail="This zone is used in ride history and cannot be deleted. Set is_active to false instead.",
        )
    db.add(AuditLog(actor_id=admin.id, action="parking_zone.deleted", entity_type="parking_zone",
                    entity_id=zone.id, details={"name": zone.name}))
    db.delete(zone)
    db.commit()