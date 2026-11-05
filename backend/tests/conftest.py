import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

TEST_DB = "/tmp/test_heartrisk.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"


@pytest.fixture(scope="session", autouse=True)
def _setup():
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    # Train the model once for the test session (fast on 303 rows).
    from app.train import train

    train()
    from app.database import Base, engine

    Base.metadata.create_all(bind=engine)
    yield
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


@pytest.fixture()
def client():
    from app.database import Base, engine
    from app.main import app

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)
