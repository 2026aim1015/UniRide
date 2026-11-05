import os

# API tests need a real PostgreSQL database (the schema uses Postgres-only features).
#   TEST_DATABASE_URL=postgresql+psycopg://user:pass@localhost/uniride_test pytest
# WARNING: that database is wiped at the start of the test run. Never point it at real data.
# Without it, only the tests that need no database run.
_test_url = os.environ.get("TEST_DATABASE_URL")
os.environ["DATABASE_URL"] = _test_url or "postgresql+psycopg://user:pass@localhost/uniride_unused"
os.environ["RATE_LIMIT_PER_MINUTE"] = "0"  # the rate limiter has its own tests
