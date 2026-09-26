"""Tests for user-configured deterministic investment strategy optimization."""

import unittest

import pandas as pd
from pydantic import ValidationError
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import StrategySimulationRequest, app
from app.services.strategy import build_investment_strategy


class StrategyTests(unittest.TestCase):
    def setUp(self) -> None:
        complaint_rows = []
        for month in range(1, 13):
            for index in range(100):
                complaint_rows.extend(
                    [
                        {
                            "complaint_id": f"E-{month}-{index}",
                            "date_opened": f"2025-{month:02d}-01",
                            "category": "Billing - estimated read",
                            "region": "Rural",
                            "transferred_between_systems": 1,
                        },
                        {
                            "complaint_id": f"M-{month}-{index}",
                            "date_opened": f"2025-{month:02d}-02",
                            "category": "Metering - no read taken",
                            "region": "Rural",
                            "transferred_between_systems": 0,
                        },
                        {
                            "complaint_id": f"B-{month}-{index}",
                            "date_opened": f"2025-{month:02d}-03",
                            "category": "Billing - disputed amount",
                            "region": "Town",
                            "transferred_between_systems": 0,
                        },
                    ]
                )
        self.frames = {
            "complaints": pd.DataFrame(complaint_rows),
            "meterReads": pd.DataFrame(
                {
                    "month": ["2025-12", "2025-12"],
                    "region": ["Rural", "Town"],
                    "accounts": [1000, 1000],
                    "smart_meter_penetration": [0, 0.8],
                }
            ),
            "unitCosts": pd.DataFrame(
                {
                    "item": [
                        "Complaint handled end to end (average)",
                        "Complaint handled end to end (transferred between systems)",
                        "Smart meter installation",
                    ],
                    "unit_cost": [68, 121, 148],
                }
            ),
        }
        self.availability = {"status": "available"}
        self.request = StrategySimulationRequest.model_validate(
            {
                "budgetUsd": 10000,
                "horizonMonths": 24,
                "objective": "maximizeNetSavings",
                "portfolioOverlapPercent": 20,
                "interventions": [
                    {
                        "id": "targeted-validation",
                        "investmentUsd": 5000,
                        "annualOperatingCostUsd": 100,
                        "reductionPercent": {"conservative": 10, "base": 20, "upside": 30},
                    },
                    {
                        "id": "meterhub-improvement",
                        "investmentUsd": 8000,
                        "annualOperatingCostUsd": 200,
                        "reductionPercent": {"conservative": 10, "base": 20, "upside": 30},
                    },
                    {
                        "id": "targeted-smart-meter-deployment",
                        "investmentUsd": 10000,
                        "annualOperatingCostUsd": 250,
                        "reductionPercent": {"conservative": 10, "base": 20, "upside": 30},
                    },
                    {
                        "id": "transfer-integration-improvement",
                        "investmentUsd": 4000,
                        "annualOperatingCostUsd": 50,
                        "reductionPercent": {"conservative": 10, "base": 20, "upside": 30},
                    },
                ],
            }
        )

    def test_optimizes_within_budget_and_returns_confidence_cases(self) -> None:
        result = build_investment_strategy(self.frames, self.availability, self.request)
        cases = {item["confidence"]: item for item in result["confidenceStrategies"]}
        base = cases["BASE"]
        self.assertLessEqual(base["allocatedUsd"], 10000)
        self.assertEqual(base["horizonMonths"], 24)
        self.assertTrue(base["allocations"])
        self.assertGreaterEqual(base["unallocatedBudgetUsd"], 0)
        self.assertEqual(result["currency"], "USD")
        self.assertGreater(cases["UPSIDE"]["annualGrossSavingsUsd"], cases["BASE"]["annualGrossSavingsUsd"])
        self.assertGreater(cases["BASE"]["annualOperatingCostUsd"], 0)
        self.assertIn("assumptions", result)

    def test_cost_and_reduction_assumptions_affect_savings_and_payback(self) -> None:
        baseline = build_investment_strategy(self.frames, self.availability, self.request)
        changed = StrategySimulationRequest.model_validate(
            self.request.model_dump() | {
                "budgetUsd": 5000,
                "interventions": [
                    self.request.interventions[0].model_dump() | {
                        "annualOperatingCostUsd": 1000,
                        "reductionPercent": {"conservative": 5, "base": 10, "upside": 15},
                    }
                ],
            }
        )
        revised = build_investment_strategy(self.frames, self.availability, changed)
        baseline_base = next(item for item in baseline["confidenceStrategies"] if item["confidence"] == "BASE")
        revised_base = next(item for item in revised["confidenceStrategies"] if item["confidence"] == "BASE")
        self.assertLess(revised_base["annualNetSavingsUsd"], baseline_base["annualNetSavingsUsd"])
        self.assertLess(revised_base["roiPercent"], baseline_base["roiPercent"])

    def test_objectives_can_choose_different_portfolio(self) -> None:
        fast_payback_request = StrategySimulationRequest.model_validate(
            self.request.model_dump() | {"objective": "minimizePayback"}
        )
        net_case = next(
            item for item in build_investment_strategy(self.frames, self.availability, self.request)["confidenceStrategies"]
            if item["confidence"] == "BASE"
        )
        payback_case = next(
            item for item in build_investment_strategy(self.frames, self.availability, fast_payback_request)["confidenceStrategies"]
            if item["confidence"] == "BASE"
        )
        self.assertEqual(payback_case["objective"], "minimizePayback")
        self.assertLessEqual(payback_case["allocatedUsd"], self.request.budgetUsd)
        self.assertIsNotNone(payback_case["paybackMonths"])
        self.assertIn("objectiveExplanation", build_investment_strategy(self.frames, self.availability, fast_payback_request))

    def test_input_requires_unique_interventions_and_bounds_assumptions(self) -> None:
        payload = self.request.model_dump()
        payload["interventions"][1]["id"] = payload["interventions"][0]["id"]
        with self.assertRaises(ValidationError):
            StrategySimulationRequest.model_validate(payload)
        payload = self.request.model_dump()
        payload["interventions"][0]["reductionPercent"]["base"] = 150
        with self.assertRaises(ValidationError):
            StrategySimulationRequest.model_validate(payload)

    def test_api_uses_custom_strategy_payload(self) -> None:
        with patch("app.main.data_loader.load", return_value=(self.frames, self.availability)):
            response = TestClient(app).post("/api/simulate", json=self.request.model_dump())
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(len(result["confidenceStrategies"]), 3)
        self.assertEqual(result["confidenceStrategies"][1]["confidence"], "BASE")
        self.assertEqual(result["currency"], "USD")

    def test_invalid_api_parameters_are_rejected(self) -> None:
        payload = self.request.model_dump()
        payload["portfolioOverlapPercent"] = 140
        response = TestClient(app).post("/api/simulate", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_optimizer_recommends_no_spend_when_no_package_fits_budget(self) -> None:
        constrained = StrategySimulationRequest.model_validate(
            self.request.model_dump() | {"budgetUsd": 1000}
        )
        result = build_investment_strategy(self.frames, self.availability, constrained)
        for case in result["confidenceStrategies"]:
            self.assertEqual(case["allocations"], [])
            self.assertEqual(case["allocatedUsd"], 0)
            self.assertEqual(case["horizonNetBenefitUsd"], 0)
