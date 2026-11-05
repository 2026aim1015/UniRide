from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.ratelimit import RateLimitMiddleware


def make_client(read=3, write=2):
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware, per_minute=read, write_per_minute=write)

    @app.get("/x")
    def read_route():
        return {"ok": True}

    @app.post("/x")
    def write_route():
        return {"ok": True}

    @app.get("/health")
    def health():
        return {"ok": True}

    return TestClient(app)


def test_reads_are_limited_then_429():
    client = make_client(read=3)
    assert [client.get("/x").status_code for _ in range(5)] == [200, 200, 200, 429, 429]
    assert "retry-after" in client.get("/x").headers


def test_writes_have_their_own_stricter_bucket():
    client = make_client(read=10, write=2)
    assert [client.post("/x").status_code for _ in range(3)] == [200, 200, 429]
    assert client.get("/x").status_code == 200


def test_health_is_never_limited():
    client = make_client(read=1)
    assert all(client.get("/health").status_code == 200 for _ in range(5))
