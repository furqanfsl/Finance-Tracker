# API Notes

The API returns JSON and uses structured validation errors for form recovery.

## Create a transaction

`POST /api/transactions`

```json
{
  "kind": "expense",
  "description": "Groceries",
  "category": "Food",
  "amount": "42.35",
  "occurred_on": "2026-06-12",
  "notes": "Weekly shop"
}
```

Success response: `201 Created`

```json
{
  "transaction": {
    "id": 1,
    "kind": "expense",
    "description": "Groceries",
    "category": "Food",
    "amount": 42.35,
    "amount_cents": 4235,
    "occurred_on": "2026-06-12",
    "notes": "Weekly shop"
  }
}
```

Validation response: `400 Bad Request`

```json
{
  "error": "Transaction could not be saved.",
  "field_errors": {
    "amount": "Amount must be greater than zero."
  }
}
```

## Summary filters

`GET /api/summary?kind=expense&start=2026-06-01&end=2026-06-30`

The summary endpoint powers all dashboard cards and charts. It returns:

- `totals`: income, expenses, net cashflow, savings rate, and transaction count
- `monthly`: month-level income, expenses, and net values
- `category_breakdown`: expense categories sorted by spend
- `recent_transactions`: latest transactions
- `budgets`: current-month budget status
- `categories`: suggestions for the transaction form
