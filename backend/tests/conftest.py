import os

# Lets the tests import the app without a real database (no connection is opened).
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://user:pass@localhost/uniride_test")
