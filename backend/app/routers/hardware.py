from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.auth import require_admin
from app.database import get_db
from app.models import AuditLog, Bicycle, HardwareCommand, HardwareDevice, Profile
from app.schemas import HardwareCommandCreate, HardwareCommandOut, HardwareDeviceCreate

router = APIRouter(prefix="/hardware", tags=["hardware"])

@router.get("/devices")
def list_devices(db: Session = Depends(get_db), _admin: Profile = Depends(require_admin)):
    return list(db.scalars(select(HardwareDevice).order_by(HardwareDevice.device_identifier)).all())

@router.post("/devices", status_code=201)
def register_device(payload: HardwareDeviceCreate, db: Session = Depends(get_db), profile: Profile = Depends(require_admin)):
    if db.get(Bicycle, payload.bicycle_id) is None:
        raise HTTPException(status_code=404, detail="Bicycle not found")
    item = HardwareDevice(bicycle_id=payload.bicycle_id, device_identifier=payload.device_identifier,
                          device_type=payload.device_type, connectivity_status=payload.connectivity_status,
                          lock_state=payload.lock_state, battery_level=payload.battery_level,
                          device_metadata=payload.device_metadata)
    db.add(item)
    db.add(AuditLog(actor_id=profile.id, action="hardware_device.registered", entity_type="hardware_device"))
    try:
        db.commit()
        db.refresh(item)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Device identifier or bicycle already has a device") from exc
    return {"id": str(item.id), "bicycle_id": str(item.bicycle_id), "device_identifier": item.device_identifier,
            "device_type": item.device_type, "connectivity_status": item.connectivity_status, "lock_state": item.lock_state,
            "battery_level": item.battery_level, "last_seen_at": item.last_seen_at, "metadata": item.device_metadata}

@router.post("/commands", response_model=HardwareCommandOut, status_code=201)
def queue_command(payload: HardwareCommandCreate, db: Session = Depends(get_db), profile: Profile = Depends(require_admin)):
    if db.get(HardwareDevice, payload.device_id) is None:
        raise HTTPException(status_code=404, detail="Hardware device not found")
    existing = db.scalar(select(HardwareCommand).where(HardwareCommand.idempotency_key == payload.idempotency_key))
    if existing:
        return existing
    command = HardwareCommand(**payload.model_dump())
    db.add(command)
    db.add(AuditLog(actor_id=profile.id, action="hardware_command.queued", entity_type="hardware_command", details={"command_type": payload.command_type}))
    try:
        db.commit()
        db.refresh(command)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Command could not be queued") from exc
    return command

@router.get("/commands", response_model=list[HardwareCommandOut])
def list_commands(db: Session = Depends(get_db), _admin: Profile = Depends(require_admin)):
    return list(db.scalars(select(HardwareCommand).order_by(HardwareCommand.requested_at.desc())).all())
