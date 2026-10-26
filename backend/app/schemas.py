import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class ProfileOut(ORMModel):
    id: uuid.UUID
    full_name: str | None
    roll_number: str | None
    role: str
    account_status: str
    created_at: datetime

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    roll_number: str | None = None

class ZoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_meters: int = Field(gt=0, le=10000)
    is_active: bool = True

class ZoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    radius_meters: int | None = Field(default=None, gt=0, le=10000)
    is_active: bool | None = None

class ZoneOut(ORMModel):
    id: uuid.UUID
    name: str
    latitude: float
    longitude: float
    radius_meters: int
    is_active: bool

class BicycleCreate(BaseModel):
    qr_code_id: str = Field(min_length=1, max_length=200)
    display_name: str = Field(min_length=1, max_length=160)
    status: Literal["available", "reserved", "in_use", "maintenance", "offline"] = "available"
    current_zone_id: uuid.UUID | None = None

class BicycleUpdate(BaseModel):
    display_name: str | None = None
    status: Literal["available", "reserved", "in_use", "maintenance", "offline"] | None = None
    current_zone_id: uuid.UUID | None = None

class BicycleOut(ORMModel):
    id: uuid.UUID
    qr_code_id: str
    display_name: str
    status: str
    current_zone_id: uuid.UUID | None
    last_latitude: float | None
    last_longitude: float | None
    last_location_at: datetime | None
    created_at: datetime

class RideStart(BaseModel):
    bicycle_id: uuid.UUID
    start_latitude: float | None = Field(default=None, ge=-90, le=90)
    start_longitude: float | None = Field(default=None, ge=-180, le=180)
    start_zone_id: uuid.UUID | None = None

class RideEnd(BaseModel):
    end_latitude: float | None = Field(default=None, ge=-90, le=90)
    end_longitude: float | None = Field(default=None, ge=-180, le=180)
    end_zone_id: uuid.UUID | None = None

class RideOut(ORMModel):
    id: uuid.UUID
    user_id: uuid.UUID
    bicycle_id: uuid.UUID
    status: str
    start_time: datetime
    end_time: datetime | None
    start_latitude: float | None
    start_longitude: float | None
    end_latitude: float | None
    end_longitude: float | None
    start_zone_id: uuid.UUID | None
    end_zone_id: uuid.UUID | None

class ReportCreate(BaseModel):
    bicycle_id: uuid.UUID
    ride_id: uuid.UUID | None = None
    category: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=4000)

class ReportStatusUpdate(BaseModel):
    status: Literal["open", "investigating", "resolved", "rejected"]

class ReportOut(ORMModel):
    id: uuid.UUID
    bicycle_id: uuid.UUID
    reporter_id: uuid.UUID
    ride_id: uuid.UUID | None
    category: str
    description: str
    status: str
    created_at: datetime

class MaintenanceCreate(BaseModel):
    bicycle_id: uuid.UUID
    report_id: uuid.UUID | None = None
    assigned_to: uuid.UUID | None = None
    description: str = Field(min_length=1, max_length=4000)

class MaintenanceUpdate(BaseModel):
    status: Literal["open", "in_progress", "completed", "cancelled"]
    assigned_to: uuid.UUID | None = None

class MaintenanceOut(ORMModel):
    id: uuid.UUID
    bicycle_id: uuid.UUID
    report_id: uuid.UUID | None
    assigned_to: uuid.UUID | None
    description: str
    status: str
    started_at: datetime | None
    completed_at: datetime | None

class HardwareDeviceCreate(BaseModel):
    bicycle_id: uuid.UUID
    device_identifier: str
    device_type: str
    connectivity_status: str = "offline"
    lock_state: str = "locked"
    battery_level: int | None = Field(default=None, ge=0, le=100)
    device_metadata: dict = Field(default_factory=dict)

class HardwareCommandCreate(BaseModel):
    device_id: uuid.UUID
    ride_id: uuid.UUID | None = None
    command_type: Literal["unlock", "lock", "status_check"]
    idempotency_key: str = Field(min_length=1, max_length=200)

class HardwareCommandOut(ORMModel):
    id: uuid.UUID
    device_id: uuid.UUID
    ride_id: uuid.UUID | None
    command_type: str
    status: str
    idempotency_key: str
    requested_at: datetime
    completed_at: datetime | None
    error_message: str | None
