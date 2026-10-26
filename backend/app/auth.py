import uuid
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app.models import Profile

# Makes the "Authorize" button appear in /docs. auto_error=False keeps our own 401 message.
bearer_scheme = HTTPBearer(auto_error=False)

def bearer_token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> str:
    if credentials is None or not credentials.credentials.strip():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required")
    return credentials.credentials.strip()

def current_profile(token: str = Depends(bearer_token), db: Session = Depends(get_db)) -> Profile:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="Supabase authentication is not configured")
    try:
        response = httpx.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}"},
            timeout=8.0,
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired Supabase token")
        user = response.json()
        user_id = uuid.UUID(user["id"])
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Supabase validation error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=401,
            detail="Could not validate Supabase token",
    )
    profile = db.get(Profile, user_id)
    if profile is None:
        metadata = user.get("user_metadata") or {}
        profile = Profile(
            id=user_id,
            full_name=metadata.get("full_name") or metadata.get("name"),
            role="student",
            account_status="active",
        )
        db.add(profile)
        try:
            db.commit()
            db.refresh(profile)
        except Exception:
            db.rollback()
            profile = db.get(Profile, user_id)
            if profile is None:
                raise HTTPException(status_code=500, detail="Could not create user profile")
    if profile.account_status != "active":
        raise HTTPException(status_code=403, detail="Account is suspended")
    return profile

def require_admin(profile: Profile = Depends(current_profile)) -> Profile:
    if profile.role != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return profile