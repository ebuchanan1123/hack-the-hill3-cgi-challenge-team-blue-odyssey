"""Tests for routing, synthetic prevention scoring, and financial arithmetic."""

import unittest

import pandas as pd

from app.services.prevention import analyze_prevention
from app.services.routing import route_complaint
from app.services.scenarios import simulate_scenarios


class RoutingTests(unittest.TestCase):
    def test_route_uses_sla_history_and_system_transfer_evidence(self) -> None:
        complaints = pd.DataFrame(
            {
                "category": ["Billing - estimated read"] * 3 + ["Other"],
                "priority": ["P2"] * 4,
                "sla_days": [10, 10, 20, 10],
                "transferred_between_systems": [1, 1, 0, 0],
                "days_to_close": [20, 15, 6, 4],
                "source_system": ["SYS-04", "SYS-01", "SYS-02", "SYS-02"],
            }
        )
        result = route_complaint(
            {
                "id": "C-1",
                "category": "Billing - estimated read",
                "region": "North",
                "priority": "P2",
                "daysOpen": 17,
                "sourceSystem": "SYS-04",
            },
            {"complaints": complaints},
        )

        self.assertEqual(result["slaRisk"], "HIGH")
        self.assertEqual(result["recommendedQueue"], "Meter & Billing Resolution")
        self.assertEqual(result["transferRisk"], "HIGH")
        self.assertEqual(result["nextAction"], "Validate meter reading")
        self.assertGreaterEqual(len(result["reasons"]), 3)
        self.assertTrue(any("historically take longer" in reason for reason in result["reasons"]))


class PreventionTests(unittest.TestCase):
    def test_synthetic_prevention_score_has_explainable_high_risk(self) -> None:
        result = analyze_prevention(
            {
                "accountId": "ACC-DEMO",
                "expectedUsage": 820,
                "estimatedUsage": 1270,
                "consecutiveEstimatedReads": 3,
                "previousCorrection": True,
            }
        )
        self.assertEqual(result["risk"], "HIGH")
        self.assertEqual(result["recommendedAction"], "Validate before billing")
        self.assertEqual(result["score"], 6)
        self.assertAlmostEqual(result["deviationPercent"], 54.88, places=2)
        self.assertEqual(len(result["reasons"]), 3)


class ScenarioTests(unittest.TestCase):
    def test_base_transfer_savings_use_unit_cost_delta_not_complaints_avoided(self) -> None:
        complaint_rows = []
        for month in range(1, 13):
            for index in range(1):
                complaint_rows.append(
                    {
                        "complaint_id": f"C-{month}-{index}",
                        "date_opened": f"2025-{month:02d}-01",
                        "category": "Billing - estimated read" if month <= 5 else "Metering - no read taken",
                        "region": "Rural" if month <= 4 else "Town",
                        "transferred_between_systems": int(month <= 5),
                    }
                )
        frames = {
            "complaints": pd.DataFrame(complaint_rows),
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
            "meterReads": pd.DataFrame(
                {
                    "month": ["2025-12", "2025-12"],
                    "region": ["Rural", "Town"],
                    "accounts": [100, 100],
                    "smart_meter_penetration": [0, 0.8],
                }
            ),
        }
        result = simulate_scenarios(frames, {"status": "available"})
        base = {scenario["id"]: scenario for scenario in result["scenarios"] if scenario["confidence"] == "BASE"}
        integration = base["transfer-integration-improvement"]

        self.assertEqual(integration["complaintsAvoided"], 0)
        self.assertGreater(integration["annualSavings"], 0)
        self.assertEqual(integration["annualSavings"], 53)
        self.assertEqual(base["targeted-validation"]["investment"], 500_000)
        self.assertEqual(result["annualization"]["observedMonths"], 12)
        self.assertIn("USD", result["currencyNote"])
