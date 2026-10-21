import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, Double, ForeignKey, Index, Integer,
    String, Text, UniqueConstraint, func, text
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = (
        CheckConstraint("role IN ('student', 'admin')", name="ck_profiles_role"),
        CheckConstraint("account_status IN ('active', 'suspended')", name="ck_profiles_account_status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    roll_number: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    role: Mapped[str] = mapped_column(Text, nullable=False, default="student", server_default="student")
    account_status: Mapped[str] = mapped_column(Text, nullable=False, default="active", server_default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

class ParkingZone(Base):
    __tablename__ = "parking_zones"
    __table_args__ = (CheckConstraint("radius_meters > 0", name="ck_parking_zones_positive_radius"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Double, nullable=False)
    longitude: Mapped[float] = mapped_column(Double, nullable=False)
    radius_meters: Mapped[int] = mapped_column(Integer, nullable=False, default=30, server_default="30")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))

class Bicycle(Base):
    __tablename__ = "bicycles"
    __table_args__ = (CheckConstraint("status IN ('available', 'reserved', 'in_use', 'maintenance', 'offline')", name="ck_bicycles_status"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    qr_code_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="available", server_default="available")
    current_zone_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("parking_zones.id", ondelete="SET NULL"))
    last_latitude: Mapped[float | None] = mapped_column(Double)
    last_longitude: Mapped[float | None] = mapped_column(Double)
    last_location_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

class Ride(Base):
    __tablename__ = "rides"
    __table_args__ = (
        CheckConstraint("status IN ('pending_start', 'active', 'pending_end', 'completed', 'cancelled')", name="ck_rides_status"),
        Index("ix_rides_user_id", "user_id"),
        Index("ix_rides_bicycle_id", "bicycle_id"),
        Index("ix_rides_status", "status"),
        Index("uq_rides_one_open_per_user", "user_id", unique=True, postgresql_where=text("status IN ('pending_start','active','pending_end')")),
        Index("uq_rides_one_open_per_bicycle", "bicycle_id", unique=True, postgresql_where=text("status IN ('pending_start','active','pending_end')")),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="RESTRICT"), nullable=False)
    bicycle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bicycles.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active", server_default="active")
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    start_latitude: Mapped[float | None] = mapped_column(Double)
    start_longitude: Mapped[float | None] = mapped_column(Double)
    end_latitude: Mapped[float | None] = mapped_column(Double)
    end_longitude: Mapped[float | None] = mapped_column(Double)
    start_zone_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("parking_zones.id", ondelete="SET NULL"))
    end_zone_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("parking_zones.id", ondelete="SET NULL"))

class HardwareDevice(Base):
    __tablename__ = "hardware_devices"
    __table_args__ = (
        CheckConstraint("battery_level IS NULL OR (battery_level >= 0 AND battery_level <= 100)", name="ck_hardware_battery_range"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bicycle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bicycles.id", ondelete="CASCADE"), nullable=False, unique=True)
    device_identifier: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    device_type: Mapped[str] = mapped_column(Text, nullable=False)
    connectivity_status: Mapped[str] = mapped_column(Text, nullable=False, default="offline", server_default="offline")
    lock_state: Mapped[str] = mapped_column(Text, nullable=False, default="locked", server_default="locked")
    battery_level: Mapped[int | None] = mapped_column(Integer)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    device_metadata: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))

class HardwareCommand(Base):
    __tablename__ = "hardware_commands"
    __table_args__ = (
        CheckConstraint("command_type IN ('unlock', 'lock', 'status_check')", name="ck_hardware_commands_type"),
        CheckConstraint("status IN ('queued', 'sent', 'acknowledged', 'succeeded', 'failed', 'timed_out')", name="ck_hardware_commands_status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hardware_devices.id", ondelete="CASCADE"), nullable=False)
    ride_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rides.id", ondelete="SET NULL"))
    command_type: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="queued", server_default="queued")
    idempotency_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)

class ProblemReport(Base):
    __tablename__ = "problem_reports"
    __table_args__ = (CheckConstraint("status IN ('open', 'investigating', 'resolved', 'rejected')", name="ck_problem_reports_status"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bicycle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bicycles.id", ondelete="RESTRICT"), nullable=False)
    reporter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="RESTRICT"), nullable=False)
    ride_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rides.id", ondelete="SET NULL"))
    category: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="open", server_default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"
    __table_args__ = (CheckConstraint("status IN ('open', 'in_progress', 'completed', 'cancelled')", name="ck_maintenance_status"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bicycle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bicycles.id", ondelete="RESTRICT"), nullable=False)
    report_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("problem_reports.id", ondelete="SET NULL"))
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="open", server_default="open")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class RideLocationEvent(Base):
    __tablename__ = "ride_location_events"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ride_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rides.id", ondelete="CASCADE"), nullable=False)
    latitude: Mapped[float] = mapped_column(Double, nullable=False)
    longitude: Mapped[float] = mapped_column(Double, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
