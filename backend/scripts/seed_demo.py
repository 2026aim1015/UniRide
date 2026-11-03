import uuid

from sqlalchemy import select

from app.database import SessionLocal
from app.models import ParkingZone, Bicycle


# Original demo record IDs: retained for compatibility.
ZONE_ID = uuid.UUID("00000000-0000-4000-8000-000000000101")
BIKE1_ID = uuid.UUID("00000000-0000-4000-8000-000000000201")
BIKE2_ID = uuid.UUID("00000000-0000-4000-8000-000000000202")


# Campus locations supplied and confirmed from the map.
CAMPUS_LOCATIONS = [
    {
        "key": "SAB",
        "name": "Super Academic Block",
        "latitude": 30.967280677294607,
        "longitude": 76.4745834408527,
    },
    {
        "key": "LIBRARY",
        "name": "Nalanda Library",
        "latitude": 30.967153116499187,
        "longitude": 76.47324455099866,
    },
    {
        "key": "ADMIN",
        "name": "Administration Block",
        "latitude": 30.968684,
        "longitude": 76.473296,
    },
    {
        "key": "RAMANUJAN",
        "name": "S. Ramanujan Block",
        "latitude": 30.969080,
        "longitude": 76.475683,
    },
    {
        "key": "SAC",
        "name": "Student Activity Centre",
        "latitude": 30.967722,
        "longitude": 76.470021,
    },
    {
        "key": "BOSE",
        "name": "JC Bose Block",
        "latitude": 30.968791,
        "longitude": 76.474702,
    },
    {
        "key": "HOSTEL",
        "name": "Chintpurni Hostel",
        "latitude": 30.9675465,
        "longitude": 76.4684675,
    },
]


def get_or_create_campus_zone(db, location):
    """Reuse an active zone at the same coordinates, or add a new one."""

    active_zones = db.scalars(
        select(ParkingZone).where(ParkingZone.is_active.is_(True))
    ).all()

    for zone in active_zones:
        same_latitude = (
            abs(zone.latitude - location["latitude"]) < 0.00001
        )
        same_longitude = (
            abs(zone.longitude - location["longitude"]) < 0.00001
        )

        if same_latitude and same_longitude:
            print(f"Using existing zone: {zone.name}")
            return zone, False

    zone = ParkingZone(
        name=location["name"],
        latitude=location["latitude"],
        longitude=location["longitude"],
        radius_meters=35,
        is_active=True,
    )

    db.add(zone)
    db.flush()

    print(f"Added parking zone: {location['name']}")
    return zone, True


def add_bicycle_if_missing(db, bicycle_id, qr_code, display_name, zone):
    """Add a bicycle only if its ID and QR code are not already present."""

    existing_by_id = db.get(Bicycle, bicycle_id)

    existing_by_qr = db.scalar(
        select(Bicycle).where(Bicycle.qr_code_id == qr_code)
    )

    if existing_by_id is not None or existing_by_qr is not None:
        print(f"Bicycle already exists, skipping: {qr_code}")
        return False

    bicycle = Bicycle(
        id=bicycle_id,
        qr_code_id=qr_code,
        display_name=display_name,
        status="available",
        current_zone_id=zone.id,
        last_latitude=None,
        last_longitude=None,
        last_location_at=None,
    )

    db.add(bicycle)
    print(f"Added bicycle: {display_name}")
    return True


def main():
    db = SessionLocal()

    zones_added = 0
    bicycles_added = 0

    try:
        # Preserve the original Main Campus Parking seed.
        # If it already exists, do not modify it.
        main_zone = db.get(ParkingZone, ZONE_ID)

        if main_zone is None:
            main_zone = ParkingZone(
                id=ZONE_ID,
                name="Main Campus Parking",
                latitude=30.9716,
                longitude=76.4732,
                radius_meters=50,
                is_active=True,
            )
            db.add(main_zone)
            db.flush()
            zones_added += 1
            print("Added original demo zone: Main Campus Parking")
        else:
            print("Original demo zone already exists; leaving unchanged.")

        # Preserve the original two demo bicycles.
        original_bikes = [
            (
                BIKE1_ID,
                "UNIRIDE-DEMO-001",
                "UniRide Bicycle 01",
            ),
            (
                BIKE2_ID,
                "UNIRIDE-DEMO-002",
                "UniRide Bicycle 02",
            ),
        ]

        for bike_id, qr_code, name in original_bikes:
            if add_bicycle_if_missing(
                db, bike_id, qr_code, name, main_zone
            ):
                bicycles_added += 1

        # Add one available demo bicycle at each campus location.
        for location in CAMPUS_LOCATIONS:
            zone, zone_was_added = get_or_create_campus_zone(
                db, location
            )

            if zone_was_added:
                zones_added += 1

            qr_code = f"UNIRIDE-ALPHA-{location['key']}-001"
            display_name = f"Demo Bicycle - {location['name']}"

            if add_bicycle_if_missing(
                db,
                uuid.uuid4(),
                qr_code,
                display_name,
                zone,
            ):
                bicycles_added += 1

        db.commit()

        print("\n===================================")
        print("UniRide demo seeding completed.")
        print(f"New parking zones: {zones_added}")
        print(f"New bicycles: {bicycles_added}")
        print("Existing records were not modified.")
        print("===================================")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
