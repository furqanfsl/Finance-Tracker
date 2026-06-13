# Database workflow

The app uses SQLite through Flask-SQLAlchemy. The active local database is created automatically at:

```text
instance/finance_tracker.sqlite3
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

If DB Browser is already open and empty, choose **Open Database** and select:

```text
D:\First_Project\instance\finance_tracker.sqlite3
```

## Tables

- `transactions` stores income and expenses as integer cents.
- `budgets` stores monthly category limits.

The dashboard also exposes `/api/database`, which returns the active SQLite path, table names, and row counts.
