from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

from sqlalchemy import func

from .models import Budget, Transaction, db

VALID_KINDS = {"income", "expense"}
DEFAULT_CATEGORIES = {
    "income": ["Salary", "Freelance", "Investments", "Refunds", "Other Income"],
    "expense": ["Housing", "Food", "Transport", "Utilities", "Entertainment", "Health", "Education", "Savings", "Other Expense"],
}


@dataclass(slots=True)
class ValidationError(Exception):
    message: str
    field_errors: dict[str, str]

    def __str__(self) -> str:
        return self.message


def cents_to_amount(cents: int) -> float:
    return round(cents / 100, 2)


def parse_amount_to_cents(value: Any) -> int:
    try:
        decimal_value = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        raise ValueError("Amount must be a valid number.") from None

    if decimal_value <= 0:
        raise ValueError("Amount must be greater than zero.")

    if decimal_value > Decimal("99999999.99"):
        raise ValueError("Amount is too large for this tracker.")

    return int(decimal_value * 100)


def parse_iso_date(value: Any) -> date:
    if not value:
        raise ValueError("Date is required.")

    try:
        return date.fromisoformat(str(value))
    except ValueError:
        raise ValueError("Date must use YYYY-MM-DD format.") from None


def parse_optional_iso_date(value: Any) -> date | None:
    if not value:
        return None
    return parse_iso_date(value)


def normalize_text(value: Any, *, field: str, max_length: int) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError(f"{field} is required.")
    if len(text) > max_length:
        raise ValueError(f"{field} must be {max_length} characters or fewer.")
    return text


def validate_transaction_payload(payload: dict[str, Any]) -> dict[str, Any]:
    errors: dict[str, str] = {}

    kind = str(payload.get("kind", "")).strip().lower()
    if kind not in VALID_KINDS:
        errors["kind"] = "Choose income or expense."

    try:
        description = normalize_text(payload.get("description"), field="Description", max_length=140)
    except ValueError as exc:
        errors["description"] = str(exc)
        description = ""

    try:
        category = normalize_text(payload.get("category"), field="Category", max_length=80)
    except ValueError as exc:
        errors["category"] = str(exc)
        category = ""

    try:
        amount_cents = parse_amount_to_cents(payload.get("amount"))
    except ValueError as exc:
        errors["amount"] = str(exc)
        amount_cents = 0

    try:
        occurred_on = parse_iso_date(payload.get("occurred_on"))
    except ValueError as exc:
        errors["occurred_on"] = str(exc)
        occurred_on = date.today()

    notes = str(payload.get("notes") or "").strip()
    if len(notes) > 280:
        errors["notes"] = "Notes must be 280 characters or fewer."

    if errors:
        raise ValidationError("Transaction could not be saved.", errors)

    return {
        "kind": kind,
        "description": description,
        "category": category,
        "amount_cents": amount_cents,
        "occurred_on": occurred_on,
        "notes": notes,
    }


def create_transaction(payload: dict[str, Any]) -> Transaction:
    validated = validate_transaction_payload(payload)
    transaction = Transaction(**validated)
    db.session.add(transaction)
    db.session.commit()
    return transaction


def delete_transaction(transaction_id: int) -> bool:
    transaction = db.session.get(Transaction, transaction_id)
    if transaction is None:
        return False
    db.session.delete(transaction)
    db.session.commit()
    return True


def transaction_query(filters: dict[str, Any] | None = None):
    filters = filters or {}
    query = Transaction.query

    kind = str(filters.get("kind") or "").strip().lower()
    if kind in VALID_KINDS:
        query = query.filter(Transaction.kind == kind)

    category = str(filters.get("category") or "").strip()
    if category:
        query = query.filter(func.lower(Transaction.category) == category.lower())

    start = parse_optional_iso_date(filters.get("start"))
    end = parse_optional_iso_date(filters.get("end"))
    if start:
        query = query.filter(Transaction.occurred_on >= start)
    if end:
        query = query.filter(Transaction.occurred_on <= end)

    return query.order_by(Transaction.occurred_on.desc(), Transaction.id.desc())


def list_transactions(filters: dict[str, Any] | None = None) -> list[Transaction]:
    return transaction_query(filters).all()


def get_category_options() -> dict[str, list[str]]:
    existing_rows = (
        db.session.query(Transaction.kind, Transaction.category)
        .distinct()
        .order_by(Transaction.kind.asc(), Transaction.category.asc())
        .all()
    )
    categories = {kind: list(values) for kind, values in DEFAULT_CATEGORIES.items()}
    for kind, category in existing_rows:
        if category not in categories.setdefault(kind, []):
            categories[kind].append(category)
    return categories


def month_label(value: date) -> str:
    return value.strftime("%b %Y")


def summarize_transactions(transactions: list[Transaction]) -> dict[str, Any]:
    total_income_cents = sum(t.amount_cents for t in transactions if t.kind == "income")
    total_expense_cents = sum(t.amount_cents for t in transactions if t.kind == "expense")
    net_cents = total_income_cents - total_expense_cents
    savings_rate = (net_cents / total_income_cents) if total_income_cents else 0

    by_month: dict[str, dict[str, int | str]] = defaultdict(
        lambda: {"month": "", "income_cents": 0, "expense_cents": 0, "net_cents": 0}
    )
    by_category: dict[str, int] = defaultdict(int)

    for transaction in sorted(transactions, key=lambda item: item.occurred_on):
        month_key = transaction.occurred_on.strftime("%Y-%m")
        row = by_month[month_key]
        row["month"] = month_label(transaction.occurred_on)
        if transaction.kind == "income":
            row["income_cents"] += transaction.amount_cents
        else:
            row["expense_cents"] += transaction.amount_cents
            by_category[transaction.category] += transaction.amount_cents
        row["net_cents"] = row["income_cents"] - row["expense_cents"]

    monthly = [
        {
            "month": row["month"],
            "income": cents_to_amount(row["income_cents"]),
            "expenses": cents_to_amount(row["expense_cents"]),
            "net": cents_to_amount(row["net_cents"]),
        }
        for _, row in sorted(by_month.items())
    ]

    category_breakdown = [
        {"category": category, "amount": cents_to_amount(amount), "amount_cents": amount}
        for category, amount in sorted(by_category.items(), key=lambda item: item[1], reverse=True)
    ]

    recent = sorted(transactions, key=lambda item: (item.occurred_on, item.id or 0), reverse=True)[:8]

    return {
        "totals": {
            "income": cents_to_amount(total_income_cents),
            "expenses": cents_to_amount(total_expense_cents),
            "net": cents_to_amount(net_cents),
            "savings_rate": round(savings_rate, 4),
            "transaction_count": len(transactions),
        },
        "monthly": monthly,
        "category_breakdown": category_breakdown,
        "recent_transactions": [transaction.to_dict() for transaction in recent],
    }


def budget_progress_for_current_month(reference_date: date | None = None) -> list[dict[str, Any]]:
    reference_date = reference_date or date.today()
    month_start = reference_date.replace(day=1)
    spent_rows = (
        db.session.query(Transaction.category, func.sum(Transaction.amount_cents))
        .filter(Transaction.kind == "expense", Transaction.occurred_on >= month_start)
        .group_by(Transaction.category)
        .all()
    )
    spent_by_category = {category: int(amount or 0) for category, amount in spent_rows}
    return [budget.to_dict(spent_by_category.get(budget.category, 0)) for budget in Budget.query.order_by(Budget.category.asc()).all()]


def dashboard_summary(filters: dict[str, Any] | None = None) -> dict[str, Any]:
    transactions = list_transactions(filters)
    summary = summarize_transactions(transactions)
    summary["budgets"] = budget_progress_for_current_month()
    summary["categories"] = get_category_options()
    return summary


def create_or_update_budget(payload: dict[str, Any]) -> Budget:
    category = normalize_text(payload.get("category"), field="Category", max_length=80)
    try:
        monthly_limit_cents = parse_amount_to_cents(payload.get("monthly_limit"))
    except ValueError as exc:
        raise ValidationError("Budget could not be saved.", {"monthly_limit": str(exc)}) from None

    budget = Budget.query.filter(func.lower(Budget.category) == category.lower()).one_or_none()
    if budget is None:
        budget = Budget(category=category, monthly_limit_cents=monthly_limit_cents)
        db.session.add(budget)
    else:
        budget.category = category
        budget.monthly_limit_cents = monthly_limit_cents
    db.session.commit()
    return budget
