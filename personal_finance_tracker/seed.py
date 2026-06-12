from __future__ import annotations

from datetime import date

from .models import Budget, Transaction, db

SAMPLE_TRANSACTIONS = [
    ("income", "Salary payment", "Salary", 320000, date(2026, 1, 26), "Monthly salary"),
    ("expense", "Rent", "Housing", 95000, date(2026, 1, 1), "Flat rent"),
    ("expense", "Groceries", "Food", 2860, date(2026, 1, 5), "Weekly shop"),
    ("expense", "Train pass", "Transport", 11800, date(2026, 1, 8), "Monthly commute"),
    ("income", "Salary payment", "Salary", 320000, date(2026, 2, 26), "Monthly salary"),
    ("income", "Freelance report", "Freelance", 42000, date(2026, 2, 17), "One-off analytics work"),
    ("expense", "Rent", "Housing", 95000, date(2026, 2, 1), "Flat rent"),
    ("expense", "Internet bill", "Utilities", 3200, date(2026, 2, 3), "Home broadband"),
    ("expense", "Cinema", "Entertainment", 1800, date(2026, 2, 14), "Weekend plan"),
    ("income", "Salary payment", "Salary", 320000, date(2026, 3, 26), "Monthly salary"),
    ("expense", "Rent", "Housing", 95000, date(2026, 3, 1), "Flat rent"),
    ("expense", "Course subscription", "Education", 4900, date(2026, 3, 9), "Skill building"),
    ("expense", "Gym membership", "Health", 2800, date(2026, 3, 11), "Monthly health"),
    ("expense", "Groceries", "Food", 3180, date(2026, 3, 18), "Weekly shop"),
    ("income", "Salary payment", "Salary", 320000, date(2026, 4, 26), "Monthly salary"),
    ("expense", "Rent", "Housing", 95000, date(2026, 4, 1), "Flat rent"),
    ("expense", "Energy bill", "Utilities", 7400, date(2026, 4, 4), "Quarterly bill"),
    ("expense", "Dinner out", "Food", 4600, date(2026, 4, 19), "Birthday meal"),
    ("income", "Salary payment", "Salary", 320000, date(2026, 5, 26), "Monthly salary"),
    ("expense", "Rent", "Housing", 95000, date(2026, 5, 1), "Flat rent"),
    ("expense", "Train pass", "Transport", 11800, date(2026, 5, 8), "Monthly commute"),
    ("expense", "Emergency dental", "Health", 8800, date(2026, 5, 16), "Unexpected cost"),
    ("income", "Salary payment", "Salary", 320000, date(2026, 6, 26), "Monthly salary"),
    ("income", "Refund", "Refunds", 6400, date(2026, 6, 3), "Travel refund"),
    ("expense", "Rent", "Housing", 95000, date(2026, 6, 1), "Flat rent"),
    ("expense", "Groceries", "Food", 3340, date(2026, 6, 7), "Weekly shop"),
    ("expense", "Utilities", "Utilities", 5100, date(2026, 6, 10), "Water and electricity"),
]

SAMPLE_BUDGETS = [
    ("Food", 30000),
    ("Transport", 15000),
    ("Entertainment", 12000),
    ("Utilities", 11000),
]


def seed_sample_data(force: bool = False) -> int:
    """Seed portfolio-friendly data. Returns the number of records created."""
    if not force and Transaction.query.count() > 0:
        return 0

    if force:
        Transaction.query.delete()
        Budget.query.delete()

    created = 0
    for kind, description, category, amount_cents, occurred_on, notes in SAMPLE_TRANSACTIONS:
        db.session.add(
            Transaction(
                kind=kind,
                description=description,
                category=category,
                amount_cents=amount_cents,
                occurred_on=occurred_on,
                notes=notes,
            )
        )
        created += 1

    for category, monthly_limit_cents in SAMPLE_BUDGETS:
        db.session.add(Budget(category=category, monthly_limit_cents=monthly_limit_cents))
        created += 1

    db.session.commit()
    return created
