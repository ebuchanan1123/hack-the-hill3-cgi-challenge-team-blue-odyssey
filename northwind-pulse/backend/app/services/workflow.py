"""Persistent workflow state for the prototype resolution and prevention demo."""

import json
import os
from pathlib import Path
from typing import Any

STATE_PATH = Path(os.getenv("NORTHWIND_WORKFLOW_STATE", Path(__file__).resolve().parents[2] / ".northwind-workflow.json"))


def _load_state() -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    try:
        value = json.loads(STATE_PATH.read_text())
        return value.get("complaintUpdates", {}), value.get("accountReviews", {})
    except (FileNotFoundError, json.JSONDecodeError, OSError, AttributeError):
        return {}, {}


complaint_updates, account_reviews = _load_state()


def _save_state() -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = STATE_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps({"complaintUpdates": complaint_updates, "accountReviews": account_reviews}, indent=2, sort_keys=True))
    temporary.replace(STATE_PATH)


def merge_complaint_update(record: dict[str, Any]) -> dict[str, Any]:
    update = complaint_updates.get(str(record.get("id")))
    return {**record, **update} if update else record


def save_complaint_update(complaint_id: str, update: dict[str, Any]) -> dict[str, Any]:
    complaint_updates[complaint_id] = {"workflowStatus": update["status"], **update}
    _save_state()
    return complaint_updates[complaint_id]


def save_account_review(account_id: str, update: dict[str, Any]) -> dict[str, Any]:
    account_reviews[account_id] = {"reviewStatus": update["action"], **update}
    _save_state()
    return account_reviews[account_id]


def get_account_review(account_id: str) -> dict[str, Any] | None:
    return account_reviews.get(account_id)


def learning_summary() -> dict[str, Any]:
    resolutions = list(complaint_updates.values())
    reviews = list(account_reviews.values())
    return {
        "complaintFeedbackCount": len(resolutions),
        "resolvedComplaintCount": sum(item.get("workflowStatus") == "Resolved" for item in resolutions),
        "accountReviewCount": len(reviews),
        "rootCauses": sorted({item["rootCause"] for item in resolutions if item.get("rootCause")}),
        "resolutionTypes": sorted({item["resolutionType"] for item in resolutions if item.get("resolutionType")}),
        "reviewActions": sorted({item["reviewStatus"] for item in reviews if item.get("reviewStatus")}),
        "message": "Saved outcomes become feedback for future prevention and routing decisions.",
    }
