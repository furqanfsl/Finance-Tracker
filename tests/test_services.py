from __future__ import annotations

from datetime import date

import pytest

from personal_finance_tracker.models import Transaction
from personal_finance_tracker.services import parse_amount_to_cents, summarize_transactions


def test_parse_amount_to_cents_rounds_half_up():
    assert parse_amount_to_cents("10.235") == 1024
    assert parse_amount_to_cents("10") == 1000


@pytest.mark.parametrize("value", ["0", "-1", "abc"])
def test_parse_amount_to_cents_rejects_invalid_values(value):
    with pytest.raises(ValueError):
        parse_amount_to_cents(value)


def test_summarize_transactions_groups_months_and_categories():
    transactions = [
        Transaction(kind="income", description="Salary", category="Salary", amount_cents=300000, occurred_on=date(2026, 5, 25)),
        Transaction(kind="expense", description="Rent", category="Housing", amount_cents=90000, occurred_on=date(2026, 5, 1)),
        Transaction(kind="expense", description="Food shop", category="Food", amount_cents=5000, occurred_on=date(2026, 6, 5)),
    ]

    summary = summarize_transactions(transactions)

    assert summary["totals"]["net"] == 2050.00
    assert [row["month"] for row in summary["monthly"]] == ["May 2026", "Jun 2026"]
    assert summary["category_breakdown"][0]["category"] == "Housing"
