from __future__ import annotations

from datetime import date, datetime, timezone

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class Transaction(db.Model):
    """A single income or expense entry.

    Amounts are stored as integer cents to avoid floating-point rounding bugs.
    """

    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(12), nullable=False, index=True)
    description = db.Column(db.String(140), nullable=False)
    category = db.Column(db.String(80), nullable=False, index=True)
    amount_cents = db.Column(db.Integer, nullable=False)
    occurred_on = db.Column(db.Date, nullable=False, index=True)
    notes = db.Column(db.String(280), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        db.CheckConstraint("kind in ('income', 'expense')", name="check_transaction_kind"),
        db.CheckConstraint("amount_cents > 0", name="check_positive_amount"),
    )

    @property
    def amount(self) -> float:
        return round(self.amount_cents / 100, 2)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "description": self.description,
            "category": self.category,
            "amount": self.amount,
            "amount_cents": self.amount_cents,
            "occurred_on": self.occurred_on.isoformat(),
            "notes": self.notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<Transaction {self.kind} {self.amount_cents} {self.category}>"


class Budget(db.Model):
    """Optional monthly category budget used for dashboard progress context."""

    __tablename__ = "budgets"

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(80), nullable=False, unique=True)
    monthly_limit_cents = db.Column(db.Integer, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        db.CheckConstraint("monthly_limit_cents > 0", name="check_positive_monthly_limit"),
    )

    @property
    def monthly_limit(self) -> float:
        return round(self.monthly_limit_cents / 100, 2)

    def to_dict(self, spent_cents: int = 0) -> dict:
        ratio = spent_cents / self.monthly_limit_cents if self.monthly_limit_cents else 0
        return {
            "id": self.id,
            "category": self.category,
            "monthly_limit": self.monthly_limit,
            "monthly_limit_cents": self.monthly_limit_cents,
            "spent": round(spent_cents / 100, 2),
            "spent_cents": spent_cents,
            "usage_ratio": round(ratio, 4),
            "status": "over" if ratio > 1 else "watch" if ratio >= 0.8 else "safe",
        }
