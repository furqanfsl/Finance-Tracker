from __future__ import annotations

import os
from pathlib import Path


class Config:
    """Base configuration shared by local development and tests."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    AUTO_CREATE_DB = os.getenv("AUTO_CREATE_DB", "true").lower() == "true"
    SEED_SAMPLE_DATA = os.getenv("SEED_SAMPLE_DATA", "true").lower() == "true"

    @staticmethod
    def database_uri(app_instance_path: str) -> str:
        configured_uri = os.getenv("DATABASE_URL")
        if configured_uri:
            return configured_uri

        db_path = Path(app_instance_path) / "finance_tracker.sqlite3"
        return f"sqlite:///{db_path.as_posix()}"
