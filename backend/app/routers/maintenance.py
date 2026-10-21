import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.auth import require_admin
from app.database import get_db
from app.models import AuditLog, Bicycle, MaintenanceRecord, Profile
from app.schemas import MaintenanceCreate, MaintenanceOut, MaintenanceUpdate

router = APIRouter(prefix="/maintenance-records", tags=["maintenance"])

@router.get("", response_model=list[MaintenanceOut])
def list_maintenance(db: Session = Depends(get_db), _admin: Profile = Depends(require_admin)):
    return list(db.scalars(select(MaintenanceRecord).order_by(MaintenanceRecord.started_at.desc())).all())

@router.post("", response_model=MaintenanceOut, status_code=201)
def create_maintenance(payload: MaintenanceCreate, db: Session = Depends(get_db), profile: Profile = Depends(require_admin)):
    bicycle = db.get(Bicycle, payload.bicycle_id)
    if bicycle is None:
        raise HTTPException(status_code=404, detail="Bicycle not found")
    item = MaintenanceRecord(**payload.model_dump())
    bicycle.status = "maintenance"
    db.add(item)
    db.add(AuditLog(actor_id=profile.id, action="maintenance.created", entity_type="maintenance_record", details={"bicycle_id": str(bicycle.id)}))
    db.commit()
    db.refresh(item)
    return item

@router.patch("/{record_id}", response_model=MaintenanceOut)
def update_maintenance(record_id: uuid.UUID, payload: MaintenanceUpdate, db: Session = Depends(get_db), profile: Profile = Depends(require_admin)):
    item = db.get(MaintenanceRecord, record_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    item.status = payload.status
    item.assigned_to = payload.assigned_to
    if payload.status == "in_progress" and item.started_at is None:
        item.started_at = datetime.now(timezone.utc)
    if payload.status == "completed":
        item.completed_at = datetime.now(timezone.utc)
        bicycle = db.get(Bicycle, item.bicycle_id)
        if bicycle and bicycle.status == "maintenance":
            bicycle.status = "available"
    db.add(AuditLog(actor_id=profile.id, action="maintenance.updated", entity_type="maintenance_record", entity_id=item.id, details={"status": payload.status}))
    db.commit()
    db.refresh(item)
    return item
