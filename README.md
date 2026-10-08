# Finance Tracker

A local personal finance dashboard built with Flask, SQLite, and vanilla
JavaScript. Record income and expenses, review spending and budgets, and export
transactions to CSV.

## Technical overview

- Flask application factory pattern
- SQLite persistence with Flask-SQLAlchemy
- JSON API for transactions, budgets, and dashboard summaries
- Integer-cent money storage to avoid floating-point rounding errors
- Server-side input validation and database constraints
- Responsive HTML/CSS dashboard with labelled forms and tables
- Chart.js visualizations for monthly cashflow and category spend
- Pytest tests for API and service behavior

## Features

- Add income and expense transactions
- Filter transactions by type and date range
- Delete transactions from the ledger
- View totals for income, expenses, net cashflow, and savings rate
- Compare monthly income, expenses, and net cashflow
- Review expense category breakdowns
- Create and review monthly category budgets
- Export the current ledger view to CSV
- Seeded sample data for an immediate dashboard demo

## Quick start

Requires Python **3.12 or later** and [uv](https://docs.astral.sh/uv/getting-started/installation/).
Clone or download the repository, then run the commands below from its root.

### Windows

Double-click `start.bat`, or run:

```powershell
.\scripts\start.ps1
```

The helper installs the locked dependencies, starts the local Flask server on
port `5000`, and opens the welcome page in your browser. Select **Open dashboard**
to use the tracker. Keep the terminal open while using the app; press `Ctrl+C`
to stop it.

If port `5000` is already busy, use another port:

```powershell
.\scripts\start.ps1 -Port 5001
```

### Manual start

```powershell
uv sync
uv run flask --app run.py run --debug
```

After Flask starts, copy the address printed in the terminal into your browser
and select **Open dashboard**. This is a local application, not a hosted demo;
the server must be running on your computer.

### VS Code Go Live

**Go Live** serves static files; it cannot run the Flask backend. The root
`index.html` is a startup guide that hands off to Flask on port `5000` once the
app is running. If you choose another Flask port, use the address printed in
its terminal instead.

## Tests

```powershell
uv run pytest
```

## SQLite database

With the default configuration, the app creates and seeds `financial.db` in the
project root automatically. To find the active database, including when you
customize `DATABASE_URL`, run:

```powershell
uv run flask --app run.py db-path
```

To initialize it yourself:

```powershell
.\scripts\init_database.ps1
```

To open the live database in DB Browser for SQLite:

```powershell
.\scripts\open_database.ps1
```

See [Database documentation](docs/DATABASE.md) for table details.

## Environment variables

Copy `.env.example` to `.env` if you want to customize local settings.

- `SECRET_KEY`: Flask secret key. Defaults to `dev` for local development.
- `DATABASE_URL`: Optional database connection override. When unset, uses
  `financial.db` in the project root.
- `CURRENCY_CODE`: Dashboard display currency. Defaults to `USD`.
- `AUTO_CREATE_DB`: Create tables on startup. Defaults to `true`.
- `SEED_SAMPLE_DATA`: Add demo records when the database is empty. Defaults to
  `true`.

Relative SQLite URLs, such as the one in `.env.example`, resolve under Flask's
`instance/` directory. Use `db-path` to confirm the file before opening it in a
database editor. The default `SECRET_KEY` and debug server are for local
development only.

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/database` | Active database overview |
| `GET` | `/api/stats` | Transaction and budget counts |
| `GET` | `/api/summary` | Dashboard totals, chart series, categories, and budgets |
| `GET` | `/api/transactions` | List transactions with optional `kind`, `start`, and `end` filters |
| `GET` | `/api/transactions/export.csv` | Download filtered transactions as CSV |
| `POST` | `/api/transactions` | Create an income or expense transaction |
| `DELETE` | `/api/transactions/<id>` | Delete a transaction |
| `GET` | `/api/categories` | List category suggestions |
| `GET` | `/api/budgets` | List budgets |
| `POST` | `/api/budgets` | Create or update a monthly category budget |
| `DELETE` | `/api/budgets/<id>` | Delete a budget |

## Project structure

```text
personal_finance_tracker/
  __init__.py          Flask factory and CLI commands
  config.py            Environment-driven config
  models.py            SQLAlchemy models
  routes.py            UI and API routes
  seed.py              Sample transactions and budgets
  services.py          Validation and aggregation logic
  static/              CSS and dashboard JavaScript
  templates/           Jinja templates
tests/                 Pytest suite
docs/                  Extra project notes
database/              SQL schema and demo database artifacts
```
