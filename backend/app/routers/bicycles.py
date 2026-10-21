import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.auth import current_profile, require_admin
from app.database import get_db
from app.models import Bicycle, Profile
from app.schemas import BicycleCreate, BicycleOut, BicycleUpdate

router = APIRouter(prefix="/bicycles", tags=["bicycles"])

@router.get("", response_model=list[BicycleOut])
def list_bicycles(status: str | None = None, db: Session = Depends(get_db), _profile: Profile = Depends(current_profile)):
    query = select(Bicycle)
    if status:
        query = query.where(Bicycle.status == status)
    return list(db.scalars(query.order_by(Bicycle.created_at.desc())).all())

@router.get("/{bicycle_id}", response_model=BicycleOut)
def get_bicycle(bicycle_id: uuid.UUID, db: Session = Depends(get_db), _profile: Profile = Depends(current_profile)):
    item = db.get(Bicycle, bicycle_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Bicycle not found")
    return item

@router.post("", response_model=BicycleOut, status_code=201)
def create_bicycle(payload: BicycleCreate, db: Session = Depends(get_db), _admin: Profile = Depends(require_admin)):
    item = Bicycle(**payload.model_dump())
    db.add(item)
    try:
        db.commit()
        db.refresh(item)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Could not create bicycle; check QR code and zone") from exc
    return item

@router.patch("/{bicycle_id}", response_model=BicycleOut)
def update_bicycle(bicycle_id: uuid.UUID, payload: BicycleUpdate, db: Session = Depends(get_db), _admin: Profile = Depends(require_admin)):
    item = db.get(Bicycle, bicycle_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Bicycle not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item
