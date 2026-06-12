from __future__ import annotations

from flask import Blueprint, jsonify, render_template, request

from .models import Budget, Transaction, db
from .services import (
    ValidationError,
    create_or_update_budget,
    create_transaction,
    dashboard_summary,
    delete_transaction,
    get_category_options,
    list_transactions,
)

ui_bp = Blueprint("ui", __name__)
api_bp = Blueprint("api", __name__, url_prefix="/api")


@ui_bp.get("/")
def dashboard():
    return render_template("index.html")


@api_bp.get("/health")
def health():
    return jsonify({"status": "ok"})


@api_bp.get("/summary")
def summary():
    try:
        payload = dashboard_summary(request.args.to_dict())
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(payload)


@api_bp.get("/transactions")
def transactions_index():
    try:
        transactions = list_transactions(request.args.to_dict())
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"transactions": [transaction.to_dict() for transaction in transactions]})


@api_bp.post("/transactions")
def transactions_create():
    payload = request.get_json(silent=True) or {}
    try:
        transaction = create_transaction(payload)
    except ValidationError as exc:
        return jsonify({"error": exc.message, "field_errors": exc.field_errors}), 400
    return jsonify({"transaction": transaction.to_dict()}), 201


@api_bp.delete("/transactions/<int:transaction_id>")
def transactions_delete(transaction_id: int):
    deleted = delete_transaction(transaction_id)
    if not deleted:
        return jsonify({"error": "Transaction not found."}), 404
    return jsonify({"status": "deleted"})


@api_bp.get("/categories")
def categories_index():
    return jsonify({"categories": get_category_options()})


@api_bp.get("/budgets")
def budgets_index():
    return jsonify({"budgets": [budget.to_dict() for budget in Budget.query.order_by(Budget.category.asc()).all()]})


@api_bp.post("/budgets")
def budgets_create():
    payload = request.get_json(silent=True) or {}
    try:
        budget = create_or_update_budget(payload)
    except ValidationError as exc:
        return jsonify({"error": exc.message, "field_errors": exc.field_errors}), 400
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"budget": budget.to_dict()}), 201


@api_bp.delete("/budgets/<int:budget_id>")
def budgets_delete(budget_id: int):
    budget = db.session.get(Budget, budget_id)
    if budget is None:
        return jsonify({"error": "Budget not found."}), 404
    db.session.delete(budget)
    db.session.commit()
    return jsonify({"status": "deleted"})


@api_bp.get("/stats")
def stats():
    return jsonify(
        {
            "transaction_count": Transaction.query.count(),
            "budget_count": Budget.query.count(),
        }
    )
