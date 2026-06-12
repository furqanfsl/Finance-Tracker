from __future__ import annotations

from flask import Flask, render_template


def create_app(test_config: dict | None = None) -> Flask:
    """Application factory for the Personal Finance Tracker."""
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY="dev",
    )

    if test_config:
        app.config.update(test_config)

    @app.get("/")
    def dashboard():
        return render_template("index.html")

    return app
