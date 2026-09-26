"""Exploratory Northwind metrics derived from source CSV columns when present."""

from __future__ import annotations

import re
from typing import Any, Iterable

import pandas as pd


def _key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def _find_column(frame: pd.DataFrame | None, aliases: Iterable[str]) -> Any | None:
    if frame is None:
        return None
    by_key = {_key(column): column for column in frame.columns}
    for alias in aliases:
        column = by_key.get(_key(alias))
        if column is not None:
            return column
    return None


def _records(frame: pd.DataFrame | None) -> list[dict[str, Any]]:
    if frame is None:
        return []
    return [
        {_camel(str(column)): _json_value(value) for column, value in row.items()}
        for row in frame.to_dict(orient="records")
    ]


def _camel(value: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", value)
    if not words:
        return value
    return words[0].lower() + "".join(word[:1].upper() + word[1:] for word in words[1:])


def _json_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        value = value.item()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _truthy(value: Any) -> bool | None:
    if pd.isna(value):
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    normalized = _key(value)
    if normalized in {"true", "yes", "y", "1", "breached", "breach", "late", "overdue", "reopened", "transferred", "open", "exception"}:
        return True
    if normalized in {"false", "no", "n", "0", "met", "ontime", "closed", "resolved", "none"}:
        return False
    return None


def _boolean_series(frame: pd.DataFrame, column: Any) -> pd.Series:
    return frame[column].map(_truthy)


def _rate(values: pd.Series | None) -> float | None:
    if values is None:
        return None
    known = values.dropna()
    if known.empty:
        return None
    return round(float(known.astype(bool).mean() * 100), 2)


def _mean(values: pd.Series | None) -> float | None:
    if values is None:
        return None
    numeric = pd.to_numeric(values, errors="coerce").dropna()
    return round(float(numeric.mean()), 2) if not numeric.empty else None


def _duration_days(frame: pd.DataFrame | None) -> pd.Series | None:
    if frame is None:
        return None
    duration_col = _find_column(
        frame,
        ("resolution_days", "resolution_time_days", "days_to_resolve", "days_to_close", "time_to_resolution_days", "resolution_duration_days"),
    )
    if duration_col is not None:
        return pd.to_numeric(frame[duration_col], errors="coerce")

    created_col = _find_column(frame, ("created_at", "opened_at", "received_at", "date_received", "created_date", "opened_date"))
    resolved_col = _find_column(frame, ("resolved_at", "closed_at", "resolution_date", "resolved_date", "closed_date"))
    if created_col is None or resolved_col is None:
        return None
    created = pd.to_datetime(frame[created_col], errors="coerce", utc=True)
    resolved = pd.to_datetime(frame[resolved_col], errors="coerce", utc=True)
    return (resolved - created).dt.total_seconds() / 86400


def _flag_column(frame: pd.DataFrame, aliases: Iterable[str], status_aliases: Iterable[str] = ()) -> pd.Series | None:
    column = _find_column(frame, aliases)
    if column is not None:
        return _boolean_series(frame, column)
    status_col = _find_column(frame, status_aliases)
    if status_col is None:
        return None
    flag_name = " ".join(_key(alias) for alias in aliases)

    def classify_status(value: Any) -> bool | None:
        if pd.isna(value):
            return None
        status = _key(value)
        if "sla" in flag_name or "breach" in flag_name:
            if any(token in status for token in ("nobreach", "notbreached", "met", "compliant", "ontime", "within")):
                return False
            if any(token in status for token in ("breach", "late", "overdue")):
                return True
        elif "reopen" in flag_name:
            if "notreopen" in status or "closed" in status or "resolved" in status:
                return False
            if "reopen" in status:
                return True
        elif "transfer" in flag_name:
            if "notransfer" in status or "nottransferred" in status or "nontransfer" in status:
                return False
            if "transfer" in status:
                return True
        return None

    return frame[status_col].map(classify_status)


def _group_counts(frame: pd.DataFrame | None, aliases: Iterable[str], label: str) -> list[dict[str, Any]] | None:
    column = _find_column(frame, aliases)
    if frame is None or column is None:
        return None
    counts = frame[column].dropna().astype(str).value_counts().sort_index()
    return [{label: str(value), "count": int(count)} for value, count in counts.items()]


def _percent(numerator: int, denominator: int) -> float | None:
    return round(numerator / denominator * 100, 2) if denominator else None


def _open_mask(frame: pd.DataFrame) -> pd.Series | None:
    status_col = _find_column(frame, ("status", "case_status", "complaint_status", "resolution_status"))
    if status_col is not None:
        status = frame[status_col].astype("string").str.lower().str.replace(r"[^a-z]", "", regex=True)
        known = status.notna()
        return known & status.isin({"open", "pending", "unresolved", "inprogress", "new", "assigned", "awaitingcustomer"})
    resolved_col = _find_column(frame, ("resolved_at", "closed_at", "resolution_date", "resolved_date", "closed_date"))
    if resolved_col is not None:
        return pd.to_datetime(frame[resolved_col], errors="coerce", utc=True).isna()
    return None


def _complaint_metrics(frame: pd.DataFrame | None) -> tuple[dict[str, Any], dict[str, Any]]:
    unavailable = {
        "totalCount": None,
        "currentOpenBacklog": None,
        "countsByCategory": None,
        "countsByRegion": None,
        "slaBreachRate": None,
        "averageResolutionDays": None,
        "reopeningRate": None,
        "transferRate": None,
    }
    empty_comparison = {
        "transferred": {"count": None, "averageResolutionDays": None, "slaBreachRate": None, "reopeningRate": None, "currentBacklogCount": None, "currentBacklogShare": None},
        "notTransferred": {"count": None, "averageResolutionDays": None, "slaBreachRate": None, "reopeningRate": None, "currentBacklogCount": None, "currentBacklogShare": None},
    }
    if frame is None:
        return unavailable, empty_comparison

    open_cases = _open_mask(frame)
    sla = _flag_column(frame, ("sla_breached", "is_sla_breach", "sla_breach", "breached_sla"), ("sla_status",))
    reopened = _flag_column(frame, ("reopened", "is_reopened", "reopen_flag", "was_reopened"), ("case_status", "complaint_status"))
    transferred = _flag_column(frame, ("transferred", "was_transferred", "is_transferred", "transfer_flag", "transfer_count", "transferred_between_systems"), ("transfer_status",))
    if transferred is not None:
        # A positive transfer count is a true indicator, but zero remains false.
        count_col = _find_column(frame, ("transfer_count",))
        if count_col is not None:
            transferred = pd.to_numeric(frame[count_col], errors="coerce").gt(0).where(frame[count_col].notna())

    metrics = {
        "totalCount": int(len(frame)),
        "currentOpenBacklog": int(open_cases.sum()) if open_cases is not None else None,
        "countsByCategory": _group_counts(frame, ("category", "complaint_category", "complaint_type", "issue_type", "reason"), "category"),
        "countsByRegion": _group_counts(frame, ("region", "service_region", "area", "district"), "region"),
        "slaBreachRate": _rate(sla),
        "averageResolutionDays": _mean(_duration_days(frame)),
        "reopeningRate": _rate(reopened),
        "transferRate": _rate(transferred),
    }
    if transferred is None:
        return metrics, empty_comparison

    comparison: dict[str, Any] = {}
    total_open = int(open_cases.sum()) if open_cases is not None else None
    duration = _duration_days(frame)
    for name, selected in (("transferred", transferred.eq(True)), ("notTransferred", transferred.eq(False))):
        subset = frame.loc[selected]
        subset_open = open_cases.loc[selected] if open_cases is not None else None
        backlog_count = int(subset_open.sum()) if subset_open is not None else None
        comparison[name] = {
            "count": int(len(subset)),
            "averageResolutionDays": _mean(duration.loc[selected]) if duration is not None else None,
            "slaBreachRate": _rate(sla.loc[selected]) if sla is not None else None,
            "reopeningRate": _rate(reopened.loc[selected]) if reopened is not None else None,
            "currentBacklogCount": backlog_count,
            "currentBacklogShare": _percent(backlog_count, total_open) if backlog_count is not None and total_open is not None else None,
        }
    return metrics, comparison


def _regional_meter_metrics(meter_reads: pd.DataFrame | None, complaints: pd.DataFrame | None) -> list[dict[str, Any]] | None:
    if meter_reads is None:
        return None
    region_col = _find_column(meter_reads, ("region", "service_region", "area", "district"))
    if region_col is None:
        return None
    estimated_col = _find_column(meter_reads, ("is_estimated", "estimated_read", "estimated", "estimated_read_rate", "read_type", "meter_read_type", "reading_type", "read_method"))

    smart_col = _find_column(meter_reads, ("smart_meter", "is_smart_meter", "smart_meter_flag", "smart_meter_penetration"))
    if smart_col is None:
        smart_col = _find_column(meter_reads, ("meter_type", "meter_technology", "meter_kind"))

    exception_col = _find_column(meter_reads, ("billing_exception", "is_billing_exception", "exception_flag", "billing_exception_flag", "billing_exceptions_raised"))
    exception_values = pd.to_numeric(meter_reads[exception_col], errors="coerce") if exception_col is not None else None
    complaint_region = _find_column(complaints, ("region", "service_region", "area", "district"))
    complaint_category = _find_column(complaints, ("category", "complaint_category", "complaint_type", "issue_type", "reason"))

    period_col = _find_column(meter_reads, ("month", "period", "reporting_month", "date"))
    snapshot = meter_reads
    if period_col is not None:
        latest_period = meter_reads[period_col].dropna().astype(str).max()
        snapshot = meter_reads.loc[meter_reads[period_col].astype(str).eq(latest_period)]

    def source_rate(column: Any | None, indices: pd.Index, pattern: str) -> float | None:
        if column is None:
            return None
        source_values = snapshot.loc[indices, column]
        values = pd.to_numeric(source_values, errors="coerce").dropna()
        if values.empty:
            values = source_values.astype("string").str.contains(pattern, case=False, na=False).astype(float)
        if values.empty:
            return None
        average = float(values.mean())
        # The source meter and rate datasets encode shares as fractions (0..1).
        return round(average * 100 if 0 <= average <= 1 else average, 2)

    rows: list[dict[str, Any]] = []
    for region, indices in snapshot.groupby(region_col, dropna=True).groups.items():
        region_result: dict[str, Any] = {
            "region": str(region),
            "estimatedReadRate": source_rate(estimated_col, indices, r"estim") if estimated_col is not None else None,
            "smartMeterPenetration": source_rate(smart_col, indices, r"smart") if smart_col is not None else None,
            "billingExceptions": int(exception_values.loc[indices].sum()) if exception_values is not None and exception_values.loc[indices].notna().any() else None,
            "meterComplaintCount": None,
            "meterComplaintShare": None,
            "period": str(snapshot.loc[indices[0], period_col]) if period_col is not None and len(indices) else None,
        }
        if complaints is not None and complaint_region is not None and complaint_category is not None:
            in_region = complaints[complaint_region].astype(str).eq(str(region))
            is_meter = complaints[complaint_category].astype(str).str.contains(r"meter|estimated read", case=False, na=False)
            region_result["meterComplaintCount"] = int((in_region & is_meter).sum())
            denominator = int(in_region.sum())
            region_result["meterComplaintShare"] = _percent(region_result["meterComplaintCount"], denominator)
        rows.append(region_result)
    return rows


def _kpi_trends(frame: pd.DataFrame | None) -> list[dict[str, Any]] | None:
    if frame is None:
        return None
    period_col = _find_column(frame, ("month", "period", "month_start", "reporting_month", "date", "year_month"))
    metric_columns = {
        "complaintVolume": ("complaint_volume", "complaints", "complaint_count", "total_complaints", "complaints_opened"),
        "averageResolutionDays": ("average_resolution_days", "avg_resolution_days", "resolution_days", "avg_days_to_close"),
        "firstContactResolution": ("first_contact_resolution", "first_contact_resolution_rate", "fcr_rate"),
        "costToServe": ("cost_to_serve", "cost_per_complaint", "service_cost", "cost_to_serve_per_account"),
        "regulatorScore": ("regulator_score", "regulatory_score", "customer_service_score", "regulator_satisfaction_score_of_5"),
    }
    found = {name: _find_column(frame, aliases) for name, aliases in metric_columns.items()}
    if period_col is None and not any(found.values()):
        return None
    results: list[dict[str, Any]] = []
    for _, row in frame.iterrows():
        result: dict[str, Any] = {"period": _json_value(row[period_col]) if period_col is not None else None}
        for name, column in found.items():
            value = _json_value(row[column]) if column is not None else None
            if name == "firstContactResolution" and isinstance(value, (int, float)) and 0 <= value <= 1:
                value = round(value * 100, 2)
            result[name] = value
        closed_col = _find_column(frame, ("complaints_closed",))
        if closed_col is not None:
            result["complaintsClosed"] = _json_value(row[closed_col])
        results.append(result)
    return results


def _pilot_summary(frame: pd.DataFrame | None) -> dict[str, Any] | None:
    if frame is None:
        return None
    aliases = {
        "containment": ("containment", "containment_rate", "containment_percent", "contained_rate", "fully_contained_rate"),
        "escalation": ("escalation", "escalation_rate", "escalation_percent", "escalated_rate", "escalated_to_agent_rate"),
        "repeatContact": ("repeat_contact", "repeat_contact_rate", "repeat_rate", "repeat_contact_within_7_days_rate"),
        "abandonment": ("abandonment", "abandonment_rate", "abandonment_percent", "abandoned_rate"),
        "satisfaction": ("satisfaction", "satisfaction_score", "csat", "customer_satisfaction", "assistant_csat_of_5"),
    }
    sessions_col = _find_column(frame, ("assistant_sessions", "sessions", "session_count"))
    weights = pd.to_numeric(frame[sessions_col], errors="coerce") if sessions_col is not None else None
    summary: dict[str, Any] = {}
    for name, candidates in aliases.items():
        column = _find_column(frame, candidates)
        if column is None:
            summary[name] = None
            continue
        values = pd.to_numeric(frame[column], errors="coerce")
        valid = values.notna()
        if weights is not None:
            valid &= weights.notna() & weights.gt(0)
            value = float((values[valid] * weights[valid]).sum() / weights[valid].sum()) if valid.any() else None
        else:
            value = float(values[valid].mean()) if valid.any() else None
        if name != "satisfaction" and value is not None and 0 <= value <= 1:
            value *= 100
        summary[name] = round(value, 2) if value is not None else None
    summary["sessions"] = int(weights.sum()) if weights is not None and weights.notna().any() else None
    summary["months"] = int(len(frame))
    return summary


def _system_landscape(frame: pd.DataFrame | None, reference_year: int | None = None) -> list[dict[str, Any]] | None:
    if frame is None:
        return None
    id_col = _find_column(frame, ("system_id", "id"))
    name_col = _find_column(frame, ("system", "system_name", "name", "application"))
    installed_col = _find_column(frame, ("year_installed", "installed_year"))
    age_col = _find_column(frame, ("system_age", "age_years", "system_age_years"))
    owner_col = _find_column(frame, ("owning_function", "owner", "business_owner", "function"))
    integration_col = _find_column(frame, ("integration_method", "integration", "integration_type"))
    cost_col = _find_column(frame, ("annual_run_cost", "annual_cost", "run_cost", "annual_run_cost_gbp"))
    notes_col = _find_column(frame, ("notes", "system_notes", "description", "constraints"))
    results: list[dict[str, Any]] = []
    for _, row in frame.iterrows():
        results.append({
            "id": _json_value(row[id_col]) if id_col is not None else None,
            "system": _json_value(row[name_col]) if name_col is not None else None,
            "systemAgeYears": _json_value(row[age_col]) if age_col is not None else (
                reference_year - int(row[installed_col]) if reference_year is not None and installed_col is not None and pd.notna(row[installed_col]) else None
            ),
            "yearInstalled": _json_value(row[installed_col]) if installed_col is not None else None,
            "owningFunction": _json_value(row[owner_col]) if owner_col is not None else None,
            "integrationMethod": _json_value(row[integration_col]) if integration_col is not None else None,
            "annualRunCost": _json_value(row[cost_col]) if cost_col is not None else None,
            "notes": _json_value(row[notes_col]) if notes_col is not None else None,
            "purpose": _json_value(row[_find_column(frame, ("purpose",))]) if _find_column(frame, ("purpose",)) is not None else None,
            "vendor": _json_value(row[_find_column(frame, ("vendor",))]) if _find_column(frame, ("vendor",)) is not None else None,
            "techStack": _json_value(row[_find_column(frame, ("tech_stack",))]) if _find_column(frame, ("tech_stack",)) is not None else None,
        })
    return results


def analyze_data(frames: dict[str, pd.DataFrame], availability: dict[str, Any]) -> dict[str, Any]:
    """Return available source facts and derived metrics, leaving unknowns null."""
    complaint_metrics, transfer_comparison = _complaint_metrics(frames.get("complaints"))
    kpis = frames.get("monthlyKpis")
    period_col = _find_column(kpis, ("month", "period"))
    reference_year = None
    if kpis is not None and period_col is not None:
        periods = kpis[period_col].dropna().astype(str)
        if not periods.empty:
            reference_year = int(periods.max()[:4])
    return {
        "dataAvailability": availability,
        "complaintMetrics": complaint_metrics,
        "transferComparison": transfer_comparison,
        "meterBillingByRegion": _regional_meter_metrics(frames.get("meterReads"), frames.get("complaints")),
        "kpiTrends": _kpi_trends(frames.get("monthlyKpis")),
        "aiPilot": _pilot_summary(frames.get("aiPilot")),
        "systems": _system_landscape(frames.get("systems"), reference_year),
        "unitCosts": _records(frames.get("unitCosts")),
    }


def complaint_records(frame: pd.DataFrame | None) -> list[dict[str, Any]]:
    """Return source complaint rows with camelCase keys and JSON-safe values."""
    records = _records(frame)
    for record in records:
        if "complaintId" in record:
            record["id"] = record.pop("complaintId")
    return records
