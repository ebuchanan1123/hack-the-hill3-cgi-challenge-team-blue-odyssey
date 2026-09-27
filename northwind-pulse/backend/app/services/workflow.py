"""In-memory workflow state for the prototype resolution and prevention demo."""

from typing import Any

complaint_updates: dict[str, dict[str, Any]] = {}
account_reviews: dict[str, dict[str, Any]] = {}


def merge_complaint_update(record: dict[str, Any]) -> dict[str, Any]:
    update = complaint_updates.get(str(record.get("id")))
    return {**record, **update} if update else record


def save_complaint_update(complaint_id: str, update: dict[str, Any]) -> dict[str, Any]:
    complaint_updates[complaint_id] = {"workflowStatus": update["status"], **update}
    return complaint_updates[complaint_id]


def save_account_review(account_id: str, update: dict[str, Any]) -> dict[str, Any]:
    account_reviews[account_id] = {"reviewStatus": update["action"], **update}
    return account_reviews[account_id]


def get_account_review(account_id: str) -> dict[str, Any] | None:
    return account_reviews.get(account_id)
