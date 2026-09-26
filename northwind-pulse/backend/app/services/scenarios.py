"""Deterministic, assumption-visible investment scenario calculations."""

from __future__ import annotations

from typing import Any

import pandas as pd

from app.services.analysis import _find_column

CONFIDENCE_CASES = {
    "CONSERVATIVE": {"reduction": 0.10, "deployment": 0.01},
    "BASE": {"reduction": 0.20, "deployment": 0.02},
    "UPSIDE": {"reduction": 0.30, "deployment": 0.03},
}
SCENARIO_INVESTMENTS = {
    "targeted-validation": 500_000,
    "meterhub-improvement": 750_000,
    "transfer-integration": 300_000,
}


def _annualization_months(complaints: pd.DataFrame) -> int | None:
    date_col = _find_column(complaints, ("date_opened", "opened_at", "created_at"))
    if date_col is None:
        return None
    dates = pd.to_datetime(complaints[date_col], errors="coerce").dropna()
    if dates.empty:
        return None
    first = dates.min()
    last = dates.max()
    return max(1, (last.year - first.year) * 12 + last.month - first.month + 1)


def _unit_cost(frames: dict[str, pd.DataFrame], item_label: str) -> float | None:
    costs = frames.get("unitCosts")
    if costs is None:
        return None
    item_col = _find_column(costs, ("item", "name", "cost_item"))
    value_col = _find_column(costs, ("unit_cost", "cost", "amount"))
    if item_col is None or value_col is None:
        return None
    matches = costs[item_col].astype(str).eq(item_label)
    values = pd.to_numeric(costs.loc[matches, value_col], errors="coerce").dropna()
    return float(values.iloc[0]) if not values.empty else None


def _scenario(
    *,
    scenario_id: str,
    name: str,
    confidence: str,
    investment: int,
    complaints_avoided: int,
    cost_per_case: float,
    annual_operating_cost: int,
    reduction: float,
    formula: str,
    extra_assumptions: list[dict[str, str]] | None = None,
    gross_annual_savings: int | None = None,
) -> dict[str, Any]:
    gross_savings = (
        gross_annual_savings
        if gross_annual_savings is not None
        else round(complaints_avoided * cost_per_case)
    )
    annual_savings = gross_savings - annual_operating_cost
    payback = round(investment / annual_savings * 12, 1) if annual_savings > 0 and investment > 0 else None
    assumptions = [
        {"label": "Complaint reduction assumption", "value": f"{reduction:.0%}"},
        {"label": "Planning investment (scenario assumption)", "value": str(investment)},
        {"label": "Annual operating cost (scenario assumption)", "value": str(annual_operating_cost)},
        {"label": "Avoided unit cost (Northwind unit-cost CSV)", "value": str(round(cost_per_case, 2))},
    ]
    if extra_assumptions:
        assumptions.extend(extra_assumptions)
    return {
        "id": scenario_id,
        "name": name,
        "investment": investment,
        "complaintsAvoided": complaints_avoided,
        "annualSavings": annual_savings,
        "paybackMonths": payback,
        "confidence": confidence,
        "assumptions": assumptions,
        "calculation": [
            formula,
            f"Annual net savings = {gross_savings} - {annual_operating_cost} = {annual_savings}",
            f"Simple payback = {investment} ÷ {annual_savings} × 12 months" if payback is not None else "Payback is not positive within the annual savings estimate",
        ],
    }


def simulate_scenarios(frames: dict[str, pd.DataFrame], availability: dict[str, Any]) -> dict[str, Any]:
    """Compare four deterministic interventions using explicit planning inputs."""
    complaints = frames.get("complaints")
    costs_frame = frames.get("unitCosts")
    if complaints is None or costs_frame is None:
        return {
            "dataAvailability": availability,
            "currencyNote": "USD; the Northwind unit-cost values are dollar costs per the supplied challenge data.",
            "scenarios": [],
            "message": "Complaint and unit-cost source datasets are both required for scenario calculations.",
        }

    months = _annualization_months(complaints)
    if months is None or months <= 0:
        return {
            "dataAvailability": availability,
            "currencyNote": "USD; the Northwind unit-cost values are dollar costs per the supplied challenge data.",
            "scenarios": [],
            "message": "Complaint dates are required to annualize the observed baseline.",
        }
    years = months / 12
    category_col = _find_column(complaints, ("category", "complaint_category"))
    region_col = _find_column(complaints, ("region", "service_region"))
    transferred_col = _find_column(complaints, ("transferred_between_systems", "transferred", "transfer_count"))
    standard_cost = _unit_cost(frames, "Complaint handled end to end (average)")
    transferred_cost = _unit_cost(frames, "Complaint handled end to end (transferred between systems)")
    installation_cost = _unit_cost(frames, "Smart meter installation")
    if standard_cost is None or transferred_cost is None or installation_cost is None:
        return {
            "dataAvailability": availability,
            "currencyNote": "USD; the Northwind unit-cost values are dollar costs per the supplied challenge data.",
            "scenarios": [],
            "message": "Required complaint-handling and smart-meter unit-cost rows were not found.",
        }

    categories = complaints[category_col].astype(str) if category_col is not None else pd.Series("", index=complaints.index)
    estimated_mask = categories.eq("Billing - estimated read")
    meter_issue_mask = categories.isin({"Billing - estimated read", "Metering - no read taken"})
    estimated_annual = round(int(estimated_mask.sum()) / years)
    meter_annual = round(int(meter_issue_mask.sum()) / years)

    transfer_annual = 0
    if transferred_col is not None:
        transferred = pd.to_numeric(complaints[transferred_col], errors="coerce").fillna(0).gt(0)
        transfer_annual = round(int(transferred.sum()) / years)

    target_regions: list[str] = []
    target_accounts = 0
    target_issue_annual = 0
    meter_data = frames.get("meterReads")
    if meter_data is not None:
        meter_region = _find_column(meter_data, ("region", "service_region"))
        month_col = _find_column(meter_data, ("month", "period"))
        smart_col = _find_column(meter_data, ("smart_meter_penetration", "smart_meter_rate"))
        account_col = _find_column(meter_data, ("accounts", "account_count"))
        if meter_region is not None and smart_col is not None:
            snapshot = meter_data
            if month_col is not None:
                latest = meter_data[month_col].dropna().astype(str).max()
                snapshot = meter_data.loc[meter_data[month_col].astype(str).eq(latest)]
            smart_values = pd.to_numeric(snapshot[smart_col], errors="coerce")
            target_rows = snapshot.loc[smart_values.le(0.01)]
            target_regions = target_rows[meter_region].dropna().astype(str).tolist()
            if account_col is not None:
                target_accounts = int(pd.to_numeric(target_rows[account_col], errors="coerce").fillna(0).sum())
            if region_col is not None and not categories.empty:
                selected = complaints[region_col].astype(str).isin(target_regions) & meter_issue_mask
                target_issue_annual = round(int(selected.sum()) / years)

    scenarios: list[dict[str, Any]] = []
    for confidence, config in CONFIDENCE_CASES.items():
        reduction = config["reduction"]
        validation_avoided = round(estimated_annual * reduction)
        scenarios.append(
            _scenario(
                scenario_id="targeted-validation",
                name="Risk-based bill validation",
                confidence=confidence,
                investment=SCENARIO_INVESTMENTS["targeted-validation"],
                complaints_avoided=validation_avoided,
                cost_per_case=standard_cost,
                annual_operating_cost=0,
                reduction=reduction,
                formula=f"Annualized estimated-read complaints ({estimated_annual}) × assumed reduction ({reduction:.0%}) × Northwind average complaint cost ({standard_cost:.2f})",
                extra_assumptions=[{"label": "Annualized eligible estimated-read complaints", "value": str(estimated_annual)}],
            )
        )
        process_avoided = round(meter_annual * reduction)
        scenarios.append(
            _scenario(
                scenario_id="meterhub-improvement",
                name="MeterHub estimation-process improvement",
                confidence=confidence,
                investment=SCENARIO_INVESTMENTS["meterhub-improvement"],
                complaints_avoided=process_avoided,
                cost_per_case=standard_cost,
                annual_operating_cost=0,
                reduction=reduction,
                formula=f"Annualized estimated-read and no-read complaints ({meter_annual}) × assumed reduction ({reduction:.0%}) × Northwind average complaint cost ({standard_cost:.2f})",
                extra_assumptions=[{"label": "Annualized eligible meter-related complaints", "value": str(meter_annual)}],
            )
        )
        deployment_share = config["deployment"]
        installs = round(target_accounts * deployment_share)
        deployment_investment = round(installs * installation_cost)
        smart_avoided = round(target_issue_annual * reduction)
        scenarios.append(
            _scenario(
                scenario_id="targeted-smart-meter-deployment",
                name="Targeted smart-meter deployment",
                confidence=confidence,
                investment=deployment_investment,
                complaints_avoided=smart_avoided,
                cost_per_case=standard_cost,
                annual_operating_cost=0,
                reduction=reduction,
                formula=f"Annualized eligible complaints in target regions ({target_issue_annual}) × assumed reduction ({reduction:.0%}) × Northwind average complaint cost ({standard_cost:.2f})",
                extra_assumptions=[
                    {"label": "Target account baseline in regions at ≤1% smart penetration", "value": str(target_accounts)},
                    {"label": "Deployment share assumption", "value": f"{deployment_share:.0%}"},
                    {"label": "Planned installations", "value": str(installs)},
                    {"label": "Northwind smart meter installation cost per meter", "value": str(round(installation_cost, 2))},
                    {"label": "Target regions", "value": ", ".join(target_regions)},
                ],
            )
        )
        transfer_savings_per_case = transferred_cost - standard_cost
        integration_avoided = round(transfer_annual * reduction)
        integration_savings = round(integration_avoided * transfer_savings_per_case)
        scenarios.append(
            _scenario(
                scenario_id="transfer-integration-improvement",
                name="Transfer and integration improvement",
                confidence=confidence,
                investment=SCENARIO_INVESTMENTS["transfer-integration"],
                complaints_avoided=0,
                cost_per_case=transfer_savings_per_case,
                annual_operating_cost=0,
                reduction=reduction,
                formula=f"Annualized transferred complaints ({transfer_annual}) × assumed transfer reduction ({reduction:.0%}) × transferred-vs-average handling cost difference ({transfer_savings_per_case:.2f})",
                gross_annual_savings=integration_savings,
                extra_assumptions=[
                    {"label": "Annualized transferred complaint volume affected", "value": str(integration_avoided)},
                    {"label": "Northwind transferred complaint cost", "value": str(round(transferred_cost, 2))},
                    {"label": "Northwind average complaint cost", "value": str(round(standard_cost, 2))},
                ],
            )
        )

    return {
        "dataAvailability": availability,
        "currencyNote": "USD; Northwind unit costs and scenario monetary amounts are expressed in dollars.",
        "annualization": {"observedMonths": months, "method": "Observed complaint counts scaled by 12 / observed month count"},
        "scenarioInputs": {
            "confidenceCases": {
                name: {"complaintReduction": f"{values['reduction']:.0%}", "smartMeterDeploymentShare": f"{values['deployment']:.0%}"}
                for name, values in CONFIDENCE_CASES.items()
            },
            "planningInvestmentAssumptions": SCENARIO_INVESTMENTS,
            "annualOperatingCostAssumption": 0,
        },
        "scenarios": scenarios,
    }
