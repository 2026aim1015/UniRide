import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.auth import current_profile, require_admin
from app.database import get_db
from app.models import AuditLog, Bicycle, ProblemReport, Profile, Ride
from app.schemas import ReportCreate, ReportOut, ReportStatusUpdate

router = APIRouter(prefix="/reports", tags=["problem reports"])

@router.post("", response_model=ReportOut, status_code=201)
def create_report(payload: ReportCreate, db: Session = Depends(get_db), profile: Profile = Depends(current_profile)):
    if db.get(Bicycle, payload.bicycle_id) is None:
        raise HTTPException(status_code=404, detail="Bicycle not found")
    if payload.ride_id:
        ride = db.get(Ride, payload.ride_id)
        if ride is None or (ride.user_id != profile.id and profile.role != "admin"):
            raise HTTPException(status_code=400, detail="Ride is invalid for this user")
    report = ProblemReport(**payload.model_dump(), reporter_id=profile.id)
    db.add(report)
    db.add(AuditLog(actor_id=profile.id, action="problem_report.created", entity_type="problem_report", details={"bicycle_id": str(payload.bicycle_id)}))
    db.commit()
    db.refresh(report)
    return report

@router.get("/me", response_model=list[ReportOut])
def my_reports(db: Session = Depends(get_db), profile: Profile = Depends(current_profile)):
    return list(db.scalars(select(ProblemReport).where(ProblemReport.reporter_id == profile.id).order_by(ProblemReport.created_at.desc())).all())

@router.get("", response_model=list[ReportOut])
def list_reports(db: Session = Depends(get_db), _admin: Profile = Depends(require_admin)):
    return list(db.scalars(select(ProblemReport).order_by(ProblemReport.created_at.desc())).all())

@router.patch("/{report_id}", response_model=ReportOut)
def update_report(report_id: uuid.UUID, payload: ReportStatusUpdate, db: Session = Depends(get_db), profile: Profile = Depends(require_admin)):
    report = db.get(ProblemReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = payload.status
    db.add(AuditLog(actor_id=profile.id, action="problem_report.status_changed", entity_type="problem_report", entity_id=report.id, details={"status": payload.status}))
    db.commit()
    db.refresh(report)
    return report
