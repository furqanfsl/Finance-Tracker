# Finance-Tracker

A portfolio-ready full-stack web application for personal finance management. Built with a Python/Flask backend, SQLite database, and vanilla JavaScript frontend for logging income, expenses, budgets, and Chart.js dashboard insights.

## What it demonstrates

- Flask application factory pattern
- SQLite persistence with Flask-SQLAlchemy
- REST API endpoints for CRUD-style data handling
- Integer-cent money storage to avoid floating-point rounding errors
- Server-side input validation and normalized relational models
- Responsive HTML/CSS dashboard with accessible forms and tables
- Chart.js visualizations for monthly cashflow and category spend
- Pytest coverage for API and service behavior

## Features

- Add income and expense transactions
- Filter transactions by type and date range
- Delete transactions from the ledger
- View totals for income, expenses, net cashflow, and savings rate
- Compare monthly income, expenses, and net cashflow
- Review expense category breakdowns
- Track starter monthly budgets
- Export the current ledger view to CSV
- Seeded sample data for an immediate dashboard demo

## Quick start

### Easiest on Windows

Double-click `start.bat`, or run:

```powershell
.\scripts\start.ps1
```

The helper installs the locked dependencies with `uv`, starts Flask on
<http://127.0.0.1:5000>, and opens the dashboard in your browser.

If port `5000` is already busy, use another port:

```powershell
.\scripts\start.ps1 -Port 5001
```

### Manual start

```powershell
uv sync
uv run flask --app run.py run --debug
```

Then open <http://127.0.0.1:5000>.

## Tests

```powershell
uv run pytest
```

## SQLite database

The app creates and seeds `instance/finance_tracker.sqlite3` automatically. To initialize it yourself:

```powershell
.\scripts\init_database.ps1
```

To open the live database in DB Browser for SQLite:

```powershell
.\scripts\open_database.ps1
```

See `docs/DATABASE.md` for table details.

## Environment variables

Copy `.env.example` to `.env` if you want to customize local settings.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | `dev` | Flask secret key for local development |
| `DATABASE_URL` | `sqlite:///instance/finance_tracker.sqlite3` | Database connection string |
| `CURRENCY_CODE` | `USD` | Currency used by the dashboard formatter |
| `AUTO_CREATE_DB` | `true` | Create tables automatically on app startup |
| `SEED_SAMPLE_DATA` | `true` | Add demo records when the database is empty |

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/summary` | Dashboard totals, chart series, categories, and budgets |
| `GET` | `/api/transactions` | List transactions with optional `kind`, `start`, and `end` filters |
| `POST` | `/api/transactions` | Create an income or expense transaction |
| `DELETE` | `/api/transactions/<id>` | Delete a transaction |
| `GET` | `/api/categories` | List category suggestions |
| `GET` | `/api/budgets` | List budgets |
| `POST` | `/api/budgets` | Create or update a monthly category budget |
| `DELETE` | `/api/budgets/<id>` | Delete a budget |

## Publishing

See `docs/PUBLISHING.md` for the GitHub publish helper.

## Project structure

```text
personal_finance_tracker/
  __init__.py          Flask factory and CLI commands
  config.py            Environment-driven config
  models.py            SQLAlchemy models
  routes.py            UI and API routes
  seed.py              Portfolio sample data
  services.py          Validation and aggregation logic
  static/              CSS and dashboard JavaScript
  templates/           Jinja templates
tests/                 Pytest suite
docs/                  Extra project notes
database/              SQL schema and demo database artifacts
```
