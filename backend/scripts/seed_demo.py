"""Insert a small local demo dataset. Run with: python -m scripts.seed_demo
Use only against a development database."""
import uuid
from sqlalchemy import select
from app.database import SessionLocal
from app.models import ParkingZone, Bicycle

ZONE_ID = uuid.UUID("00000000-0000-4000-8000-000000000101")
BIKE1_ID = uuid.UUID("00000000-0000-4000-8000-000000000201")
BIKE2_ID = uuid.UUID("00000000-0000-4000-8000-000000000202")

def main():
    db = SessionLocal()
    try:
        zone = db.get(ParkingZone, ZONE_ID)
        if not zone:
            zone = ParkingZone(id=ZONE_ID, name="Main Campus Parking", latitude=30.9716, longitude=76.4732, radius_meters=50, is_active=True)
            db.add(zone)
            db.flush()
        else:
            # Keep the development seed aligned with the IIT Ropar campus reference point.
            zone.latitude = 30.9716
            zone.longitude = 76.4732
            zone.radius_meters = 30
            zone.is_active = True
        for bike_id, qr, name in [
            (BIKE1_ID, "UNIRIDE-DEMO-001", "UniRide Bicycle 01"),
            (BIKE2_ID, "UNIRIDE-DEMO-002", "UniRide Bicycle 02"),
        ]:
            if db.get(Bicycle, bike_id) is None and db.scalar(select(Bicycle.id).where(Bicycle.qr_code_id == qr)) is None:
                db.add(Bicycle(id=bike_id, qr_code_id=qr, display_name=name, status="available", current_zone_id=zone.id))
        db.commit()
        print("Demo parking zone and bicycles are ready.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
