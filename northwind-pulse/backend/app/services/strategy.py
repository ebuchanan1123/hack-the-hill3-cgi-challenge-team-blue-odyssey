"""Deterministic bounded portfolio selection using explicit user assumptions."""

from __future__ import annotations

from itertools import combinations
from typing import Any

import pandas as pd

from app.models.scenarios import StrategySimulationRequest
from app.services.analysis import _find_column
from app.services.scenarios import _annualization_months, _unit_cost

INTERVENTION_LABELS = {
    "targeted-validation": "Risk-based bill validation",
    "meterhub-improvement": "MeterHub estimation-process improvement",
    "targeted-smart-meter-deployment": "Targeted smart-meter deployment",
    "transfer-integration-improvement": "Transfer and integration improvement",
}


def _annual_baselines(frames: dict[str, pd.DataFrame]) -> dict[str, dict[str, Any]]:
    complaints = frames.get("complaints")
    if complaints is None:
        return {}
    months = _annualization_months(complaints)
    if not months:
        return {}
    annual_factor = 12 / months
    category_col = _find_column(complaints, ("category", "complaint_category"))
    region_col = _find_column(complaints, ("region", "service_region"))
    transfer_col = _find_column(complaints, ("transferred_between_systems", "transferred", "transfer_count"))
    if category_col is None:
        return {}
    categories = complaints[category_col].astype(str)
    estimated = categories.eq("Billing - estimated read")
    no_read = categories.eq("Metering - no read taken")
    meter_issue = estimated | no_read

    meter_data = frames.get("meterReads")
    low_smart_regions: list[str] = []
    if meter_data is not None:
        meter_region = _find_column(meter_data, ("region", "service_region"))
        smart_col = _find_column(meter_data, ("smart_meter_penetration", "smart_meter_rate"))
        month_col = _find_column(meter_data, ("month", "period"))
        if meter_region is not None and smart_col is not None:
            snapshot = meter_data
            if month_col is not None:
                period_values = meter_data[month_col].dropna().astype(str)
                if not period_values.empty:
                    latest = period_values.max()
                    snapshot = meter_data.loc[meter_data[month_col].astype(str).eq(latest)]
            penetration = pd.to_numeric(snapshot[smart_col], errors="coerce")
            low_smart_regions = snapshot.loc[penetration.le(0.01), meter_region].dropna().astype(str).tolist()

    smart_eligible = pd.Series(False, index=complaints.index)
    if region_col is not None and low_smart_regions:
        smart_eligible = complaints[region_col].astype(str).isin(low_smart_regions) & meter_issue

    transfers = pd.Series(False, index=complaints.index)
    if transfer_col is not None:
        transfers = pd.to_numeric(complaints[transfer_col], errors="coerce").fillna(0).gt(0)

    standard_cost = _unit_cost(frames, "Complaint handled end to end (average)")
    transferred_cost = _unit_cost(frames, "Complaint handled end to end (transferred between systems)")
    transfer_delta = (
        transferred_cost - standard_cost
        if transferred_cost is not None and standard_cost is not None
        else None
    )

    return {
        "targeted-validation": {
            "annualEligibleEvents": round(int(estimated.sum()) * annual_factor),
            "unitSavingsUsd": standard_cost,
            "eventLabel": "estimated-read complaints avoided",
            "impactLabel": "Complaint reduction",
            "impactKind": "complaints",
            "source": "northwind_complaints.csv; annualized estimated-read complaint count × Northwind average complaint cost",
        },
        "meterhub-improvement": {
            "annualEligibleEvents": round(int(meter_issue.sum()) * annual_factor),
            "unitSavingsUsd": standard_cost,
            "eventLabel": "meter-related complaints avoided",
            "impactLabel": "Complaint reduction",
            "impactKind": "complaints",
            "source": "northwind_complaints.csv; annualized estimated-read and no-read complaint count × Northwind average complaint cost",
        },
        "targeted-smart-meter-deployment": {
            "annualEligibleEvents": round(int(smart_eligible.sum()) * annual_factor),
            "unitSavingsUsd": standard_cost,
            "eventLabel": "meter-related complaints avoided in regions with ≤1% smart-meter penetration",
            "impactLabel": "Complaint reduction",
            "impactKind": "complaints",
            "source": "northwind_complaints.csv and latest northwind_meter_reads.csv snapshot; eligible regional complaints × Northwind average complaint cost",
        },
        "transfer-integration-improvement": {
            "annualEligibleEvents": round(int(transfers.sum()) * annual_factor),
            "unitSavingsUsd": transfer_delta,
            "eventLabel": "transfers reduced (not complaints avoided)",
            "impactLabel": "Transfer reduction",
            "impactKind": "transfers",
            "source": "northwind_complaints.csv and northwind_unit_costs.csv; annualized transferred complaint volume × the Northwind transferred-vs-average handling cost difference",
        },
    }


def _portfolio_result(
    selected: tuple[dict[str, Any], ...],
    *,
    budget_usd: float,
    horizon_months: int,
    confidence: str,
    overlap_rate: float,
    objective: str,
) -> dict[str, Any]:
    ordered = sorted(
        selected,
        key=lambda item: (-item["standaloneAnnualGrossSavingsUsd"], item["id"]),
    )
    allocations: list[dict[str, Any]] = []
    total_investment = 0.0
    total_annual_operating_cost = 0.0
    annual_gross_savings = 0.0
    annual_complaints_avoided = 0
    annual_transfers_reduced = 0
    for position, option in enumerate(ordered):
        overlap_factor = (1 - overlap_rate) ** position
        incremental_savings = option["standaloneAnnualGrossSavingsUsd"] * overlap_factor
        reduction = option["reductionPercent"]
        selected_events = round(option["annualEligibleEvents"] * reduction / 100 * overlap_factor)
        investment = option["investmentUsd"]
        operating = option["annualOperatingCostUsd"]
        total_investment += investment
        total_annual_operating_cost += operating
        annual_gross_savings += incremental_savings
        if option["impactKind"] == "complaints":
            annual_complaints_avoided += selected_events
        else:
            annual_transfers_reduced += selected_events
        allocations.append(
            {
                "id": option["id"],
                "name": option["name"],
                "allocationUsd": round(investment, 2),
                "annualOperatingCostUsd": round(operating, 2),
                "eligibleEventsPerYear": option["annualEligibleEvents"],
                "impactPercent": reduction,
                "impactKind": option["impactKind"],
                "eventLabel": option["eventLabel"],
                "impactLabel": option["impactLabel"],
                "overlapDiscountPercent": round((1 - overlap_factor) * 100, 2),
                "estimatedEventsPerYear": selected_events if option["impactKind"] == "complaints" else 0,
                "estimatedTransfersReducedPerYear": selected_events if option["impactKind"] == "transfers" else 0,
                "standaloneAnnualGrossSavingsUsd": round(option["standaloneAnnualGrossSavingsUsd"], 2),
                "incrementalAnnualGrossSavingsUsd": round(incremental_savings, 2),
                "source": option["source"],
                "calculation": (
                    f"{option['annualEligibleEvents']} eligible {option['impactKind']} per year × "
                    f"{reduction:.2f}% assumed reduction × ${option['unitSavingsUsd']:.2f} savings per event"
                ),
            }
        )

    annual_net_savings = annual_gross_savings - total_annual_operating_cost
    horizon_years = horizon_months / 12
    horizon_net_benefit = annual_net_savings * horizon_years - total_investment
    horizon_total_cost = total_investment + total_annual_operating_cost * horizon_years
    roi_percent = (horizon_net_benefit / horizon_total_cost * 100) if horizon_total_cost > 0 else None
    payback = (total_investment / annual_net_savings * 12) if total_investment > 0 and annual_net_savings > 0 else None
    return {
        "confidence": confidence,
        "objective": objective,
        "allocations": allocations,
        "budgetUsd": round(budget_usd, 2),
        "allocatedUsd": round(total_investment, 2),
        "unallocatedBudgetUsd": round(max(0, budget_usd - total_investment), 2),
        "estimatedComplaintsAvoidedPerYear": annual_complaints_avoided,
        "estimatedTransfersReducedPerYear": annual_transfers_reduced,
        "annualGrossSavingsUsd": round(annual_gross_savings, 2),
        "annualOperatingCostUsd": round(total_annual_operating_cost, 2),
        "annualNetSavingsUsd": round(annual_net_savings, 2),
        "horizonMonths": horizon_months,
        "horizonNetBenefitUsd": round(horizon_net_benefit, 2),
        "totalProjectedCostUsd": round(horizon_total_cost, 2),
        "roiPercent": round(roi_percent, 2) if roi_percent is not None else None,
        "paybackMonths": round(payback, 1) if payback is not None else None,
        "overlapAssumptionPercent": round(overlap_rate * 100, 2),
        "calculation": [
            f"Annual net savings = ${annual_gross_savings:.2f} gross savings - ${total_annual_operating_cost:.2f} annual operating cost = ${annual_net_savings:.2f}",
            f"Horizon net benefit = ${annual_net_savings:.2f} × {horizon_years:.2f} years - ${total_investment:.2f} one-time investment = ${horizon_net_benefit:.2f}",
            f"ROI on total projected cost = ${horizon_net_benefit:.2f} horizon net benefit ÷ ${horizon_total_cost:.2f} total projected cost × 100 = {roi_percent:.2f}%" if roi_percent is not None else "ROI is unavailable because the portfolio has no projected costs.",
            f"Simple payback = investment ÷ annual net savings × 12 = {payback:.1f} months" if payback is not None else "Simple payback is unavailable because annual net savings are not positive.",
        ],
    }


def _objective_key(result: dict[str, Any], objective: str) -> tuple[float, float, float]:
    net_benefit = float(result["horizonNetBenefitUsd"])
    roi = result["roiPercent"]
    roi_value = float(roi) if roi is not None else float("-inf")
    payback = result["paybackMonths"]
    payback_value = float(payback) if payback is not None else float("inf")
    if objective == "maximizeRoi":
        return roi_value, net_benefit, -payback_value
    if objective == "minimizePayback":
        # Require a positive horizon benefit; zero-spend is the safe fallback if none qualifies.
        return (1 / payback_value if payback_value > 0 and net_benefit > 0 else float("-inf"), net_benefit, roi_value)
    return net_benefit, roi_value, -payback_value


def build_investment_strategy(
    frames: dict[str, pd.DataFrame],
    availability: dict[str, Any],
    request: StrategySimulationRequest,
) -> dict[str, Any]:
    """Optimize all allowed intervention subsets; four candidates mean only 16 combinations."""
    baselines = _annual_baselines(frames)
    input_by_id = {item.id: item for item in request.interventions}
    inputs_missing_data: list[str] = []
    candidates_by_confidence: dict[str, list[dict[str, Any]]] = {}

    for confidence in ("conservative", "base", "upside"):
        options: list[dict[str, Any]] = []
        for intervention_id, user_input in input_by_id.items():
            baseline = baselines.get(intervention_id)
            if baseline is None or baseline["unitSavingsUsd"] is None:
                if intervention_id not in inputs_missing_data:
                    inputs_missing_data.append(intervention_id)
                continue
            impact_percent = float(getattr(user_input.reductionPercent, confidence))
            eligible = int(baseline["annualEligibleEvents"])
            unit_savings = float(baseline["unitSavingsUsd"])
            options.append(
                {
                    "id": intervention_id,
                    "name": INTERVENTION_LABELS[intervention_id],
                    "investmentUsd": float(user_input.investmentUsd),
                    "annualOperatingCostUsd": float(user_input.annualOperatingCostUsd),
                    "annualEligibleEvents": eligible,
                    "reductionPercent": impact_percent,
                    "unitSavingsUsd": unit_savings,
                    "impactKind": baseline["impactKind"],
                    "eventLabel": baseline["eventLabel"],
                    "impactLabel": baseline["impactLabel"],
                    "source": baseline["source"],
                    "standaloneAnnualGrossSavingsUsd": eligible * impact_percent / 100 * unit_savings,
                }
            )

        affordable = [option for option in options if option["investmentUsd"] <= request.budgetUsd]
        portfolios: list[dict[str, Any]] = []
        for subset_size in range(len(affordable) + 1):
            for subset in combinations(affordable, subset_size):
                if sum(item["investmentUsd"] for item in subset) > request.budgetUsd:
                    continue
                portfolios.append(
                    _portfolio_result(
                        subset,
                        budget_usd=request.budgetUsd,
                        horizon_months=request.horizonMonths,
                        confidence=confidence.upper(),
                        overlap_rate=request.portfolioOverlapPercent / 100,
                        objective=request.objective,
                    )
                )
        best = max(portfolios, key=lambda portfolio: _objective_key(portfolio, request.objective))
        candidates_by_confidence[confidence] = [best]

    strategies = [candidates_by_confidence[level][0] for level in ("conservative", "base", "upside")]
    baseline_periods = _annualization_months(frames["complaints"]) if frames.get("complaints") is not None else None
    if request.objective == "maximizeNetSavings":
        objective_explanation = "Select the affordable portfolio with the greatest projected net benefit over the chosen horizon."
    elif request.objective == "maximizeRoi":
        objective_explanation = "Select the affordable portfolio with the greatest projected net benefit per dollar of total projected cost over the chosen horizon."
    else:
        objective_explanation = "Select the affordable portfolio with the shortest simple payback among portfolios with positive net benefit over the chosen horizon."

    return {
        "currency": "USD",
        "dataAvailability": availability,
        "objective": request.objective,
        "objectiveExplanation": objective_explanation,
        "budgetUsd": request.budgetUsd,
        "horizonMonths": request.horizonMonths,
        "baselineObservedMonths": baseline_periods,
        "confidenceStrategies": strategies,
        "userInputs": [
            {
                "id": item.id,
                "investmentUsd": item.investmentUsd,
                "annualOperatingCostUsd": item.annualOperatingCostUsd,
                "reductionPercent": item.reductionPercent.model_dump(),
            }
            for item in request.interventions
        ],
        "assumptions": [
            "Annual event baselines are calculated from complaint dates and scaled to 12 months.",
            "Northwind event costs are applied as supplied in USD.",
            "User-supplied impact percentages are scenario assumptions, not measured causal effects.",
            "For each additional selected intervention, estimated benefits are discounted by the user-supplied portfolio overlap percentage to reduce double counting.",
            "Recurring operating costs are applied for every month in the requested horizon; investments are one-time costs.",
            "Annual savings and costs are held constant over the horizon; calculations do not discount future cash flows or model inflation, tax, financing, or implementation ramp-up.",
            "This is a bounded subset search over at most four all-or-nothing intervention packages, not a continuous optimization or procurement recommendation.",
        ],
        "dataLimitations": [
            f"No usable complaint or unit-cost baseline was available for: {', '.join(inputs_missing_data)}. Those interventions were excluded."
        ] if inputs_missing_data else [],
    }
