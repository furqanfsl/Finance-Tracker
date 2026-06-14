from __future__ import annotations

import csv
from io import StringIO


def create_transaction(client, **overrides):
    payload = {
        "kind": "expense",
        "description": "Groceries",
        "category": "Food",
        "amount": "42.35",
        "occurred_on": "2026-06-12",
        "notes": "Weekly shop",
    }
    payload.update(overrides)
    return client.post("/api/transactions", json=payload)


def test_health_endpoint(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_create_transaction_and_summary(client):
    expense_response = create_transaction(client)
    income_response = create_transaction(
        client,
        kind="income",
        description="Salary",
        category="Salary",
        amount="3000.00",
        occurred_on="2026-06-10",
        notes="Monthly pay",
    )

    assert expense_response.status_code == 201
    assert income_response.status_code == 201

    summary = client.get("/api/summary").get_json()

    assert summary["totals"]["income"] == 3000.00
    assert summary["totals"]["expenses"] == 42.35
    assert summary["totals"]["net"] == 2957.65
    assert summary["totals"]["transaction_count"] == 2
    assert summary["monthly"][0]["month"] == "Jun 2026"
    assert summary["category_breakdown"][0]["category"] == "Food"


def test_invalid_transaction_returns_field_errors(client):
    response = client.post(
        "/api/transactions",
        json={"kind": "expense", "description": "", "amount": "-10", "occurred_on": "bad-date"},
    )

    payload = response.get_json()

    assert response.status_code == 400
    assert payload["error"] == "Transaction could not be saved."
    assert "description" in payload["field_errors"]
    assert "amount" in payload["field_errors"]
    assert "occurred_on" in payload["field_errors"]


def test_transaction_filters_and_delete(client):
    create_transaction(client, description="Groceries", category="Food", amount="25")
    income = create_transaction(
        client,
        kind="income",
        description="Freelance project",
        category="Freelance",
        amount="450",
    ).get_json()["transaction"]

    filtered = client.get("/api/transactions?kind=income").get_json()

    assert len(filtered["transactions"]) == 1
    assert filtered["transactions"][0]["description"] == "Freelance project"

    delete_response = client.delete(f"/api/transactions/{income['id']}")
    remaining = client.get("/api/transactions").get_json()

    assert delete_response.status_code == 200
    assert len(remaining["transactions"]) == 1
    assert remaining["transactions"][0]["kind"] == "expense"


def test_transaction_category_filter_is_case_insensitive(client):
    create_transaction(client, description="Groceries", category="Food", amount="25")
    create_transaction(client, description="Train fare", category="Transport", amount="12")

    response = client.get("/api/transactions?category=food")
    transactions = response.get_json()["transactions"]

    assert response.status_code == 200
    assert len(transactions) == 1
    assert transactions[0]["description"] == "Groceries"


def test_reversed_date_range_returns_bad_request(client):
    create_transaction(client, occurred_on="2026-06-12")

    transactions_response = client.get("/api/transactions?start=2026-06-30&end=2026-06-01")
    summary_response = client.get("/api/summary?start=2026-06-30&end=2026-06-01")

    assert transactions_response.status_code == 400
    assert summary_response.status_code == 400
    assert transactions_response.get_json()["error"] == "Start date must be before or equal to end date."


def test_transactions_csv_export_respects_filters(client):
    create_transaction(client, description="Groceries", category="Food", amount="25", notes="Weekly shop")
    create_transaction(
        client,
        kind="income",
        description="Freelance project",
        category="Freelance",
        amount="450",
        notes="Invoice paid",
    )

    response = client.get("/api/transactions/export.csv?kind=expense")
    rows = list(csv.DictReader(StringIO(response.get_data(as_text=True))))

    assert response.status_code == 200
    assert response.mimetype == "text/csv"
    assert "attachment; filename=finance-transactions.csv" in response.headers["Content-Disposition"]
    assert rows == [
        {
            "Date": "2026-06-12",
            "Description": "Groceries",
            "Category": "Food",
            "Type": "expense",
            "Amount": "-25.00",
            "Notes": "Weekly shop",
        }
    ]


def test_budget_create_and_progress(client):
    budget_response = client.post("/api/budgets", json={"category": "Food", "monthly_limit": "100.00"})
    create_transaction(client, category="Food", amount="25.00", occurred_on="2026-06-12")

    budgets = client.get("/api/summary").get_json()["budgets"]

    assert budget_response.status_code == 201
    assert budgets[0]["category"] == "Food"
    assert budgets[0]["monthly_limit"] == 100.00


def test_budget_delete(client):
    budget = client.post("/api/budgets", json={"category": "Food", "monthly_limit": "100.00"}).get_json()[
        "budget"
    ]

    response = client.delete(f"/api/budgets/{budget['id']}")
    budgets = client.get("/api/budgets").get_json()["budgets"]

    assert response.status_code == 200
    assert budgets == []


def test_database_status_endpoint(client):
    create_transaction(client, category="Food", amount="25.00", occurred_on="2026-06-12")

    response = client.get("/api/database")
    payload = response.get_json()["database"]

    assert response.status_code == 200
    assert payload["exists"] is True
    assert payload["fingerprint"]
    assert payload["modified_at_ns"] > 0
    assert {table["name"] for table in payload["tables"]} == {"budgets", "transactions"}
