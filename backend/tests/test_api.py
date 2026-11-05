"""End-to-end API tests against a real PostgreSQL database.

Authentication is replaced by a test header (X-Test-User); everything else is real:
routers, validation, row locks, partial unique indexes and the Alembic migration.
"""
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient
from sqlalchemy import text

pytestmark = pytest.mark.skipif(
    not os.environ.get("TEST_DATABASE_URL"), reason="set TEST_DATABASE_URL to run the API tests"
)

ZONE = {"name": "Test Library", "latitude": 30.96556, "longitude": 76.47059, "radius_meters": 50}
INSIDE = {"latitude": 30.96556, "longitude": 76.47059}
OUTSIDE = {"latitude": 30.9800, "longitude": 76.4900}


@pytest.fixture(scope="module")
def env():
    from app import auth
    from app.database import SessionLocal, engine
    from app.main import app
    from app.models import Bicycle, ParkingZone, Profile

    # Start from an empty database and build it with the real migration.
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    cfg.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    command.upgrade(cfg, "head")

    def fake_profile(request: Request):
        user = request.headers.get("x-test-user")
        if not user:
            raise HTTPException(status_code=401, detail="Bearer token required")
        with SessionLocal() as db:
            return db.get(Profile, uuid.UUID(user))

    app.dependency_overrides[auth.current_profile] = fake_profile

    ids = {}
    with SessionLocal() as db:
        admin = Profile(id=uuid.uuid4(), full_name="Admin", role="admin")
        students = [Profile(id=uuid.uuid4(), full_name=f"Student {i}", role="student") for i in range(10)]
        zone = ParkingZone(**ZONE)
        db.add_all([admin, *students, zone])
        db.flush()
        bikes = [Bicycle(qr_code_id=f"UR-BIKE-T{i}", display_name=f"Bike {i}", current_zone_id=zone.id) for i in range(8)]
        db.add_all(bikes)
        db.commit()
        ids = {
            "admin": str(admin.id),
            "students": [str(s.id) for s in students],
            "zone": str(zone.id),
            "bikes": [str(b.id) for b in bikes],
        }
    yield TestClient(app), ids
    app.dependency_overrides.clear()


def as_user(user_id):
    return {"X-Test-User": user_id}


def start(client, user, bike, zone, where=INSIDE):
    return client.post("/api/v1/rides/start", headers=as_user(user), json={
        "bicycle_id": bike, "start_zone_id": zone,
        "start_latitude": where["latitude"], "start_longitude": where["longitude"]})


def end(client, user, ride_id, zone, where=INSIDE):
    return client.post(f"/api/v1/rides/{ride_id}/end", headers=as_user(user), json={
        "end_zone_id": zone, "end_latitude": where["latitude"], "end_longitude": where["longitude"]})


def bike_status(client, ids, bike):
    r = client.get(f"/api/v1/bicycles/{bike}", headers=as_user(ids["admin"]))
    return r.json()["status"]


# ---------- authentication and roles ----------

def test_requests_without_login_are_rejected(env):
    client, _ = env
    assert client.get("/api/v1/bicycles").status_code == 401


def test_student_cannot_use_admin_endpoints(env):
    client, ids = env
    s = as_user(ids["students"][0])
    assert client.post("/api/v1/bicycles", headers=s, json={"display_name": "X"}).status_code == 403
    assert client.get("/api/v1/rides", headers=s).status_code == 403
    assert client.get("/api/v1/profiles", headers=s).status_code == 403
    assert client.get("/api/v1/maintenance-records", headers=s).status_code == 403
    assert client.post("/api/v1/parking-zones", headers=s, json=ZONE).status_code == 403
    assert client.delete(f"/api/v1/bicycles/{ids['bikes'][0]}", headers=s).status_code == 403


def test_admin_can_create_bicycle_with_generated_id(env):
    client, ids = env
    r = client.post("/api/v1/bicycles", headers=as_user(ids["admin"]), json={"display_name": "New bike"})
    assert r.status_code == 201
    assert r.json()["qr_code_id"].startswith("UR-BIKE-")


# ---------- rides ----------

def test_full_ride_lifecycle_and_zone_checks(env):
    client, ids = env
    user, bike, zone = ids["students"][0], ids["bikes"][0], ids["zone"]
    assert start(client, user, bike, zone, OUTSIDE).status_code == 400  # outside the geofence
    r = start(client, user, bike, zone)
    assert r.status_code == 201
    ride_id = r.json()["id"]
    assert bike_status(client, ids, bike) == "in_use"

    active = client.get("/api/v1/rides/me/active", headers=as_user(user))
    assert active.json()["id"] == ride_id  # used to restore the ride after a refresh

    assert end(client, user, ride_id, zone, OUTSIDE).status_code == 400
    assert end(client, ids["students"][1], ride_id, zone).status_code == 403  # not their ride
    assert end(client, user, ride_id, zone).status_code == 200
    assert bike_status(client, ids, bike) == "available"
    assert client.get("/api/v1/rides/me/active", headers=as_user(user)).json() is None
    assert end(client, user, ride_id, zone).status_code == 409  # already finished


def test_one_open_ride_per_user_and_per_bicycle(env):
    client, ids = env
    a, b = ids["students"][1], ids["students"][2]
    r = start(client, a, ids["bikes"][1], ids["zone"])
    assert r.status_code == 201
    assert start(client, a, ids["bikes"][2], ids["zone"]).status_code == 409  # second ride, same user
    assert start(client, b, ids["bikes"][1], ids["zone"]).status_code == 409  # bicycle already taken
    assert client.post(f"/api/v1/rides/{r.json()['id']}/cancel", headers=as_user(a)).status_code == 200
    assert bike_status(client, ids, ids["bikes"][1]) == "available"


def test_simultaneous_start_requests_only_one_wins(env):
    client, ids = env
    bike = ids["bikes"][3]
    users = ids["students"][3:10]  # 7 different students, same bicycle, same moment

    def attempt(user):
        return start(client, user, bike, ids["zone"]).status_code

    with ThreadPoolExecutor(max_workers=len(users)) as pool:
        codes = list(pool.map(attempt, users))
    assert codes.count(201) == 1, codes
    assert all(c in (201, 409) for c in codes), codes
    # clean up so later tests are unaffected
    admin = as_user(ids["admin"])
    for ride in client.get("/api/v1/rides", headers=admin).json():
        if ride["bicycle_id"] == bike and ride["status"] == "active":
            assert client.post(f"/api/v1/rides/{ride['id']}/cancel", headers=admin).status_code == 200


def test_location_events_are_private_to_the_rider(env):
    client, ids = env
    user, other = ids["students"][4], ids["students"][5]
    ride = start(client, user, ids["bikes"][4], ids["zone"]).json()
    url = f"/api/v1/rides/{ride['id']}/locations"
    assert client.post(url, headers=as_user(user), json=INSIDE).status_code == 201
    assert client.post(url, headers=as_user(other), json=INSIDE).status_code == 403
    assert client.get(url, headers=as_user(other)).status_code == 403
    assert len(client.get(url, headers=as_user(user)).json()) == 1
    assert client.post(f"/api/v1/rides/{ride['id']}/cancel", headers=as_user(other)).status_code == 403
    assert client.post(f"/api/v1/rides/{ride['id']}/cancel", headers=as_user(ids["admin"])).status_code == 200
    assert client.post(url, headers=as_user(user), json=INSIDE).status_code == 409  # ride closed


# ---------- maintenance and reports ----------

def test_maintenance_and_bicycle_status_do_not_conflict(env):
    client, ids = env
    admin, bike = as_user(ids["admin"]), ids["bikes"][5]
    student = ids["students"][6]

    ride = start(client, student, bike, ids["zone"]).json()
    busy = client.post("/api/v1/maintenance-records", headers=admin, json={"bicycle_id": bike, "description": "brakes"})
    assert busy.status_code == 409  # cannot repair a bicycle that is being ridden
    assert end(client, student, ride["id"], ids["zone"]).status_code == 200

    report = client.post("/api/v1/reports", headers=as_user(student), json={
        "bicycle_id": bike, "category": "Brake issue", "description": "squeaks"}).json()
    rec = client.post("/api/v1/maintenance-records", headers=admin, json={
        "bicycle_id": bike, "report_id": report["id"], "description": "fix brakes"})
    assert rec.status_code == 201
    assert bike_status(client, ids, bike) == "maintenance"
    assert start(client, student, bike, ids["zone"]).status_code == 409  # not available

    reports = {r["id"]: r for r in client.get("/api/v1/reports", headers=admin).json()}
    assert reports[report["id"]]["status"] == "investigating"

    rid = rec.json()["id"]
    assert client.patch(f"/api/v1/maintenance-records/{rid}", headers=admin, json={"status": "completed"}).status_code == 200
    assert bike_status(client, ids, bike) == "available"
    reports = {r["id"]: r for r in client.get("/api/v1/reports", headers=admin).json()}
    assert reports[report["id"]]["status"] == "resolved"
    assert client.patch(f"/api/v1/maintenance-records/{rid}", headers=admin, json={"status": "open"}).status_code == 409


def test_student_cannot_change_report_status(env):
    client, ids = env
    s = as_user(ids["students"][7])
    report = client.post("/api/v1/reports", headers=s, json={
        "bicycle_id": ids["bikes"][6], "category": "Flat tyre", "description": "flat"}).json()
    assert client.patch(f"/api/v1/reports/{report['id']}", headers=s, json={"status": "resolved"}).status_code == 403
    ok = client.patch(f"/api/v1/reports/{report['id']}", headers=as_user(ids["admin"]), json={"status": "resolved"})
    assert ok.status_code == 200 and ok.json()["status"] == "resolved"


# ---------- bicycles and zones ----------

def test_bicycle_delete_rules(env):
    client, ids = env
    admin = as_user(ids["admin"])
    fresh = client.post("/api/v1/bicycles", headers=admin, json={"display_name": "Temp"}).json()
    assert client.delete(f"/api/v1/bicycles/{fresh['id']}", headers=admin).status_code == 204
    used = ids["bikes"][0]  # has ride history
    assert client.delete(f"/api/v1/bicycles/{used}", headers=admin).status_code == 409


def test_zone_partial_patch_and_delete_rules(env):
    client, ids = env
    admin = as_user(ids["admin"])
    assert client.patch(f"/api/v1/parking-zones/{ids['zone']}", headers=admin, json={"radius_meters": 60}).status_code == 200
    zone = [z for z in client.get("/api/v1/parking-zones", headers=admin).json() if z["id"] == ids["zone"]][0]
    assert zone["radius_meters"] == 60 and zone["name"] == ZONE["name"]  # other fields untouched
    assert client.patch(f"/api/v1/parking-zones/{ids['zone']}", headers=admin, json={"name": None}).status_code == 422
    assert client.delete(f"/api/v1/parking-zones/{ids['zone']}", headers=admin).status_code == 409  # used by rides
    spare = client.post("/api/v1/parking-zones", headers=admin, json={**ZONE, "name": "Spare"}).json()
    assert client.delete(f"/api/v1/parking-zones/{spare['id']}", headers=admin).status_code == 204
