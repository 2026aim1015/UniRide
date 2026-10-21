from app.models import (
    Profile, ParkingZone, Bicycle, Ride, HardwareDevice, HardwareCommand,
    ProblemReport, MaintenanceRecord, RideLocationEvent, AuditLog
)

def test_all_expected_tables_are_defined():
    expected = {
        "profiles", "bicycles", "parking_zones", "rides", "hardware_devices",
        "hardware_commands", "problem_reports", "maintenance_records",
        "ride_location_events", "audit_logs",
    }
    actual = {
        Profile.__tablename__, ParkingZone.__tablename__, Bicycle.__tablename__,
        Ride.__tablename__, HardwareDevice.__tablename__, HardwareCommand.__tablename__,
        ProblemReport.__tablename__, MaintenanceRecord.__tablename__,
        RideLocationEvent.__tablename__, AuditLog.__tablename__,
    }
    assert actual == expected

def test_ride_open_indexes_are_partial_unique():
    indexes = {index.name: index for index in Ride.__table__.indexes}
    assert indexes["uq_rides_one_open_per_user"].unique is True
    assert indexes["uq_rides_one_open_per_bicycle"].unique is True
    assert indexes["uq_rides_one_open_per_user"].dialect_options["postgresql"]["where"] is not None
    assert indexes["uq_rides_one_open_per_bicycle"].dialect_options["postgresql"]["where"] is not None
