"""Ask Pulse tests use a fake Gemini client and never call the external API."""

import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.services.ask_pulse import answer_question


class FakeModels:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload
        self.last_request: dict[str, object] | None = None

    def generate_content(self, **kwargs: object) -> SimpleNamespace:
        self.last_request = kwargs
        return SimpleNamespace(text=json.dumps(self.payload))


class FakeInteractions:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload
        self.last_request: dict[str, object] | None = None

    def create(self, **kwargs: object) -> SimpleNamespace:
        self.last_request = kwargs
        return SimpleNamespace(output_text=json.dumps(self.payload))


class FakeGeminiClient:
    def __init__(self, payload: dict[str, object]) -> None:
        self.models = FakeModels(payload)
        self.interactions = FakeInteractions(payload)


class AskPulseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.frames = {
            "complaints": pd.DataFrame(
                {
                    "complaint_id": ["C-1", "C-2"],
                    "category": ["Billing", "Metering"],
                    "region": ["North", "North"],
                    "status": ["Open", "Closed"],
                    "sla_breach": [1, 0],
                    "reopened": [0, 0],
                    "transferred_between_systems": [1, 0],
                    "days_to_close": [12, 6],
                    "date_opened": ["2025-01-01", "2025-01-02"],
                    "date_closed": [None, "2025-01-08"],
                }
            )
        }
        self.availability = {"status": "partial", "loadedDatasets": ["complaints"]}

    def test_answer_returns_only_backend_resolved_evidence(self) -> None:
        client = FakeGeminiClient(
            {
                "answer": "The complaint file contains two cases.",
                "evidenceIds": ["complaints.totalCount"],
                "suggestedFollowUps": ["What is the open backlog?"],
                "insufficientEvidence": False,
            }
        )

        result = answer_question("How many complaints are there?", self.frames, self.availability, client=client)

        self.assertEqual(result.grounding, "grounded")
        self.assertEqual(result.evidence[0].value, "2")
        self.assertEqual(result.evidence[0].source, "northwind_complaints.csv")
        self.assertEqual(result.suggestedFollowUps, ["What is the open backlog?"])
        self.assertEqual(client.interactions.last_request["model"], "gemini-3.1-flash-lite")
        self.assertFalse(client.interactions.last_request["store"])
        self.assertIn("only using the supplied evidence", client.interactions.last_request["system_instruction"])
        response_format = client.interactions.last_request["response_format"]
        self.assertEqual(response_format["mime_type"], "application/json")

    def test_unrecognized_evidence_id_is_not_returned_as_a_grounded_claim(self) -> None:
        client = FakeGeminiClient(
            {
                "answer": "There are 99 cases.",
                "evidenceIds": ["made-up-number"],
                "suggestedFollowUps": [],
                "insufficientEvidence": False,
            }
        )

        result = answer_question("How many complaints are there?", self.frames, self.availability, client=client)

        self.assertEqual(result.grounding, "insufficientData")
        self.assertEqual(result.evidence, [])
        self.assertNotIn("99", result.answer)

    def test_http_endpoint_uses_typed_request_and_returns_camel_case_evidence(self) -> None:
        client = FakeGeminiClient(
            {
                "answer": "There are two complaints.",
                "evidenceIds": ["complaints.totalCount"],
                "suggestedFollowUps": [],
                "insufficientEvidence": False,
            }
        )
        with (
            patch("app.main.data_loader.load", return_value=(self.frames, self.availability)),
            patch("app.services.ask_pulse.get_gemini_client", return_value=client),
        ):
            response = TestClient(app).post("/api/ask-pulse", json={"question": "How many complaints?"})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["grounding"], "grounded")
        self.assertEqual(body["evidence"][0]["evidenceType"], "sourceFact")
        self.assertIn("suggestedFollowUps", body)
        self.assertNotIn("suggested_follow_ups", body)

    def test_invalid_question_is_rejected_before_generation(self) -> None:
        response = TestClient(app).post("/api/ask-pulse", json={"question": "?"})
        self.assertEqual(response.status_code, 422)

    def test_http_endpoint_reports_missing_key_without_calling_provider(self) -> None:
        with patch.dict("os.environ", {"GEMINI_API_KEY": ""}):
            response = TestClient(app).post("/api/ask-pulse", json={"question": "How many complaints?"})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "Gemini is not configured on this backend")
