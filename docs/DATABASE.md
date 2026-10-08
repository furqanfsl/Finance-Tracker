# Database workflow

The app uses SQLite through Flask-SQLAlchemy. With the default configuration,
the app creates this file in the project root:

```text
financial.db
```

## Create or reset the database

```powershell
.\scripts\init_database.ps1
```

For a clean database with the demo transactions and budgets:

```powershell
.\scripts\init_database.ps1 -Reset
```

## Open in DB Browser for SQLite

```powershell
.\scripts\open_database.ps1
```

If DB Browser is already open and empty, choose **Open Database** and select
the path printed by:

```powershell
uv run flask --app run.py db-path
```

This also works when `DATABASE_URL` points to a different file. Relative SQLite
URLs, including the one in `.env.example`, resolve under Flask's `instance/`
directory.

DB Browser for SQLite is not a database server; it is an editor for the same
SQLite file that Flask reads and writes. If you edit rows in DB Browser, click
**Write Changes**. The dashboard checks the database file for changes every few
seconds and refreshes the charts and ledger automatically.

## Tables

- `transactions` stores income and expenses as integer cents.
- `budgets` stores monthly category limits.

The dashboard also exposes `/api/database`, which returns the active SQLite path, file fingerprint, table names, and row counts.
