from __future__ import annotations

import pytest

from personal_finance_tracker import create_app
from personal_finance_tracker.models import db


@pytest.fixture()
def app(tmp_path):
    database_path = tmp_path / "test.sqlite3"
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path.as_posix()}",
            "AUTO_CREATE_DB": False,
            "SEED_SAMPLE_DATA": False,
            "CURRENCY_CODE": "USD",
        }
    )

    with app.app_context():
        db.create_all()

    yield app

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
