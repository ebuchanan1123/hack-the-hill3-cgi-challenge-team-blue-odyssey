"""Deterministic, evidence-based complaint triage and queue recommendations."""

from __future__ import annotations

import re
from typing import Any

import pandas as pd

from app.services.analysis import _find_column

QUEUE_RULES = (
    ("meter", "Meter & Billing Resolution", "Validate meter reading"),
    ("billing", "Meter & Billing Resolution", "Review the bill and validate the underlying reading"),
    ("payment", "Payment Support", "Review the payment plan and arrears options"),
    ("supply", "Network Operations", "Check the interruption record and coordinate network resolution"),
    ("water", "Water Operations", "Review the water quality or pressure investigation"),
    ("service", "Customer Service Resolution", "Review the service history and agree the next customer update"),
)


def _normalized(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value).lower()).strip()


def _flag_values(frame: pd.DataFrame, column: Any) -> pd.Series:
    return pd.to_numeric(frame[column], errors="coerce").fillna(0).gt(0)


def _sla_days(frame: pd.DataFrame | None, category: str, priority: str) -> float | None:
    if frame is None:
        return None
    sla_col = _find_column(frame, ("sla_days", "sla_target_days", "sla_deadline_days"))
    if sla_col is None:
        return None
    values = pd.to_numeric(frame[sla_col], errors="coerce")
    category_col = _find_column(frame, ("category", "complaint_category"))
    priority_col = _find_column(frame, ("priority", "case_priority"))
    candidates = pd.Series(True, index=frame.index)
    if category_col is not None:
        candidates &= frame[category_col].astype(str).map(_normalized).eq(_normalized(category))
    if priority_col is not None:
        candidates &= frame[priority_col].astype(str).map(_normalized).eq(_normalized(priority))
    match = values.loc[candidates].dropna()
    if match.empty and category_col is not None:
        match = values.loc[frame[category_col].astype(str).map(_normalized).eq(_normalized(category))].dropna()
    if match.empty:
        match = values.dropna()
    return float(match.median()) if not match.empty else None


def _transfer_context(frame: pd.DataFrame | None, category: str, source_system: str | None) -> dict[str, Any]:
    if frame is None:
        return {"risk": "MEDIUM", "rate": None, "slower": False, "systemNote": False}
    transfer_col = _find_column(frame, ("transferred_between_systems", "transferred", "transfer_count"))
    category_col = _find_column(frame, ("category", "complaint_category"))
    system_col = _find_column(frame, ("source_system", "source_system_id"))
    if transfer_col is None:
        return {"risk": "MEDIUM", "rate": None, "slower": False, "systemNote": False}

    transfers = _flag_values(frame, transfer_col)
    overall_rate = float(transfers.mean()) if len(transfers) else 0.0
    subset = pd.Series(True, index=frame.index)
    if category_col is not None:
        subset &= frame[category_col].astype(str).map(_normalized).eq(_normalized(category))
    category_rows = frame.loc[subset]
    category_transfers = transfers.loc[subset]
    category_rate = float(category_transfers.mean()) if len(category_transfers) else overall_rate

    system_rate: float | None = None
    if source_system and system_col is not None:
        source_rows = frame.loc[frame[system_col].astype(str).eq(source_system)]
        if not source_rows.empty:
            system_rate = float(transfers.loc[source_rows.index].mean())

    duration_col = _find_column(frame, ("days_to_close", "resolution_days", "days_to_resolve"))
    slower = False
    if duration_col is not None:
        durations = pd.to_numeric(frame[duration_col], errors="coerce")
        moved = durations.loc[transfers].dropna()
        not_moved = durations.loc[~transfers].dropna()
        slower = bool(not moved.empty and not not_moved.empty and moved.mean() > not_moved.mean())

    risk = "LOW"
    if category_rate >= overall_rate + 0.10 or (system_rate is not None and system_rate >= overall_rate + 0.10) or (slower and category_rate >= overall_rate):
        risk = "HIGH"
    elif category_rate > 0 or system_rate is not None:
        risk = "MEDIUM"

    system_note = bool(source_system == "SYS-04")
    if system_note:
        risk = "HIGH"
    return {"risk": risk, "rate": category_rate, "overallRate": overall_rate, "slower": slower, "systemNote": system_note}


def route_complaint(
    payload: dict[str, Any],
    frames: dict[str, pd.DataFrame],
    context_cache: dict[str, dict[tuple[Any, ...], Any]] | None = None,
) -> dict[str, Any]:
    """Route one case using explicit category, SLA, and historical transfer rules."""
    category = str(payload["category"])
    normalized_category = _normalized(category)
    selected = next((item for item in QUEUE_RULES if item[0] in normalized_category), None)
    if selected is None:
        queue, next_action = "General Complaints", "Review the complaint and assign an appropriate resolution owner"
    else:
        _, queue, next_action = selected

    reasons = [f"Category '{category}' maps to the {queue} queue"]
    complaints = frames.get("complaints")
    supplied_sla = payload.get("slaDays")
    sla_key = (category, str(payload["priority"]))
    if supplied_sla is not None:
        sla_days = float(supplied_sla)
    elif context_cache is not None and sla_key in context_cache.setdefault("sla", {}):
        sla_days = context_cache["sla"][sla_key]
    else:
        sla_days = _sla_days(complaints, category, str(payload["priority"]))
        if context_cache is not None:
            context_cache.setdefault("sla", {})[sla_key] = sla_days
    days_open = float(payload["daysOpen"])
    if sla_days is None or sla_days <= 0:
        sla_risk = "MEDIUM"
        reasons.append("SLA deadline is unavailable in the source data; manual deadline review is needed")
    else:
        elapsed = days_open / sla_days
        if elapsed >= 1:
            sla_risk = "HIGH"
            reasons.append(f"Case is at or beyond its {sla_days:g}-day SLA target")
        elif elapsed >= 0.8 or str(payload["priority"]).upper() == "P1":
            sla_risk = "MEDIUM"
            reasons.append(f"Case has used {elapsed:.0%} of its {sla_days:g}-day SLA target")
        else:
            sla_risk = "LOW"
            reasons.append(f"Case is within its {sla_days:g}-day SLA target")

    if str(payload["priority"]).upper() == "P1":
        if sla_risk != "HIGH":
            sla_risk = "HIGH"
        reasons.append("P1 priority requires urgent handling")

    if "estimated read" in normalized_category:
        next_action = "Validate meter reading"
        reasons.append("Complaint relates to an estimated read")
    elif "no read" in normalized_category:
        next_action = "Arrange a meter read or field visit"
        reasons.append("Complaint records that no meter read was taken")

    transfer_key = (category, payload.get("sourceSystem"))
    if context_cache is not None and transfer_key in context_cache.setdefault("transfer", {}):
        transfer = context_cache["transfer"][transfer_key]
    else:
        transfer = _transfer_context(complaints, category, payload.get("sourceSystem"))
        if context_cache is not None:
            context_cache.setdefault("transfer", {})[transfer_key] = transfer
    if transfer["systemNote"]:
        reasons.append("CaseTrack history can be lost during transfers, according to the system notes")
    if transfer["slower"]:
        reasons.append("Transferred complaints historically take longer to close than non-transferred complaints")
    if transfer["rate"] is not None:
        reasons.append(f"Similar complaints have a {transfer['rate']:.0%} historical transfer rate")
    else:
        reasons.append("Historical transfer evidence is unavailable; keep the case in one queue where possible")

    return {
        "id": str(payload["id"]),
        "category": category,
        "region": str(payload["region"]),
        "priority": str(payload["priority"]),
        "daysOpen": int(days_open) if days_open.is_integer() else days_open,
        "slaRisk": sla_risk,
        "recommendedQueue": queue,
        "transferRisk": transfer["risk"],
        "nextAction": next_action,
        "reasons": reasons,
    }
