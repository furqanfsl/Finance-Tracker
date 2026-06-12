from __future__ import annotations

import os

import click
from flask import Flask

from .config import Config
from .models import db
from .routes import api_bp, ui_bp
from .seed import seed_sample_data


def create_app(test_config: dict | None = None) -> Flask:
    """Application factory for the Personal Finance Tracker."""
    app = Flask(__name__, instance_relative_config=True)
    os.makedirs(app.instance_path, exist_ok=True)

    app.config.from_object(Config)
    app.config["SQLALCHEMY_DATABASE_URI"] = Config.database_uri(app.instance_path)

    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    app.register_blueprint(ui_bp)
    app.register_blueprint(api_bp)
    register_cli(app)

    if app.config.get("AUTO_CREATE_DB"):
        with app.app_context():
            db.create_all()
            if app.config.get("SEED_SAMPLE_DATA"):
                seed_sample_data(force=False)

    return app


def register_cli(app: Flask) -> None:
    @app.cli.command("init-db")
    def init_db_command():
        """Create database tables without deleting existing data."""
        db.create_all()
        click.echo("Database tables are ready.")

    @app.cli.command("seed-db")
    @click.option("--force", is_flag=True, help="Replace existing sample records.")
    def seed_db_command(force: bool):
        """Load sample income, expenses, and budgets."""
        db.create_all()
        created = seed_sample_data(force=force)
        click.echo(f"Seed complete. Created {created} records.")
