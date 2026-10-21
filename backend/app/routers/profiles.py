from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.auth import current_profile
from app.database import get_db
from app.models import Profile
from app.schemas import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profiles", tags=["profiles"])

@router.get("/me", response_model=ProfileOut)
def get_me(profile: Profile = Depends(current_profile)):
    return profile

@router.patch("/me", response_model=ProfileOut)
def update_me(payload: ProfileUpdate, profile: Profile = Depends(current_profile), db: Session = Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(profile, key, value)
    try:
        db.commit()
        db.refresh(profile)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Profile update conflicts with an existing value") from exc
    return profile
