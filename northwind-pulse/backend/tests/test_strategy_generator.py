"""AI-selected investment options with deterministic backend financial calculations."""

import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.models.strategy_generation import StrategyGenerationRequest
from app.services.strategy_generator import generate_investment_strategy


class FakeInteractions:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload
        self.last_request: dict[str, object] | None = None

    def create(self, **kwargs: object) -> SimpleNamespace:
        self.last_request = kwargs
        return SimpleNamespace(output_text=json.dumps(self.payload))


class FakeGeminiClient:
    def __init__(self, payload: dict[str, object]) -> None:
        self.interactions = FakeInteractions(payload)


class StrategyGeneratorTests(unittest.TestCase):
    def setUp(self) -> None:
        complaint_rows = []
        for month in range(1, 13):
            for index in range(100):
                complaint_rows.extend(
                    [
                        {"complaint_id": f"E-{month}-{index}", "date_opened": f"2025-{month:02d}-01", "category": "Billing - estimated read", "region": "Rural", "transferred_between_systems": 1},
                        {"complaint_id": f"M-{month}-{index}", "date_opened": f"2025-{month:02d}-02", "category": "Metering - no read taken", "region": "Rural", "transferred_between_systems": 0},
                    ]
                )
        self.frames = {
            "complaints": pd.DataFrame(complaint_rows),
            "meterReads": pd.DataFrame({"month": ["2025-12"], "region": ["Rural"], "accounts": [10000], "smart_meter_penetration": [0]}),
            "unitCosts": pd.DataFrame({"item": ["Complaint handled end to end (average)", "Complaint handled end to end (transferred between systems)", "Smart meter installation"], "unit_cost": [68, 121, 148]}),
        }
        self.availability = {"status": "available"}
        self.request = StrategyGenerationRequest(
            budgetUsd=100000,
            horizonMonths=36,
            objective="maximizeNetSavings",
            annualOperatingCostUsd=9000,
            portfolioOverlapPercent=20,
            priorities="Prioritize billing reliability and a rollout that can be expanded.",
        )
        self.proposal = {
            "title": "Billing reliability first",
            "summary": "Start with validation and process improvements, retaining part of the budget for flexibility.",
            "recommendedInterventions": [
                {"id": "targeted-validation", "allocationPercent": 60, "rationale": "Estimated-read complaints are a measurable addressable cohort."},
                {"id": "meterhub-improvement", "allocationPercent": 30, "rationale": "The estimation process is a source-supported intervention area."},
            ],
            "caveats": ["Effect percentages are planning assumptions, not measured causal results."],
        }

    def test_gemini_suggests_actions_but_backend_calculates_dollars(self) -> None:
        client = FakeGeminiClient(self.proposal)
        result = generate_investment_strategy(self.frames, self.availability, self.request, client=client)

        self.assertEqual(result["aiStrategy"]["title"], "Billing reliability first")
        suggestions = result["aiStrategy"]["recommendedInterventions"]
        self.assertEqual([item["id"] for item in suggestions], ["targeted-validation", "meterhub-improvement"])
        self.assertEqual(suggestions[0]["suggestedAllocationUsd"], 8160)
        self.assertEqual(suggestions[1]["suggestedAllocationUsd"], 16320)
        self.assertEqual(result["confidenceStrategies"][1]["budgetUsd"], 100000)
        self.assertLessEqual(result["confidenceStrategies"][1]["annualOperatingCostUsd"], 9000)
        self.assertGreater(result["confidenceStrategies"][1]["allocatedUsd"], 0)
        self.assertTrue(any("Gemini does not calculate dollar values, savings, ROI, or payback" in item for item in result["assumptions"]))
        prompt = client.interactions.last_request["input"]
        self.assertIn(self.request.priorities, prompt)
        self.assertIn("Do not calculate or state ROI", client.interactions.last_request["system_instruction"])
        self.assertFalse(client.interactions.last_request["store"])

    def test_recommendation_weights_over_one_hundred_are_normalized(self) -> None:
        proposal = self.proposal | {
            "recommendedInterventions": [
                {"id": "targeted-validation", "allocationPercent": 80, "rationale": "Priority one."},
                {"id": "meterhub-improvement", "allocationPercent": 80, "rationale": "Priority two."},
            ]
        }
        result = generate_investment_strategy(self.frames, self.availability, self.request, client=FakeGeminiClient(proposal))
        suggested = result["aiStrategy"]["recommendedInterventions"]
        self.assertAlmostEqual(sum(item["suggestedAllocationPercent"] for item in suggested), 100)
        self.assertTrue(any("normalized" in item for item in result["assumptions"]))

    def test_api_accepts_only_brief_and_returns_dynamic_suggestions(self) -> None:
        client = FakeGeminiClient(self.proposal)
        with (
            patch("app.main.data_loader.load", return_value=(self.frames, self.availability)),
            patch("app.services.strategy_generator.get_gemini_client", return_value=client),
        ):
            response = TestClient(app).post("/api/strategy/generate", json=self.request.model_dump())
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["aiStrategy"]["recommendedInterventions"][0]["id"], "targeted-validation")
        self.assertEqual(body["planningInputs"]["budgetUsd"], 100000)

    def test_invalid_user_objective_is_rejected(self) -> None:
        response = TestClient(app).post("/api/strategy/generate", json={"budgetUsd": 1000, "objective": "guess"})
        self.assertEqual(response.status_code, 422)
