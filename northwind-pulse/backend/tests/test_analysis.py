"""Tests for deterministic calculations using isolated fixture data."""

import unittest
from unittest.mock import patch

import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.services.analysis import analyze_data, complaint_records


class AnalysisTests(unittest.TestCase):
    def test_complaint_api_adds_deterministic_routing_fields(self) -> None:
        complaints = pd.DataFrame(
            {
                "complaint_id": ["C1"],
                "category": ["Billing - estimated read"],
                "region": ["North"],
                "priority": ["P1"],
                "days_open": [12],
                "source_system": ["SYS-01"],
                "sla_days": [10],
                "status": ["Open"],
            }
        )
        with patch("app.main.data_loader.load", return_value=({"complaints": complaints}, {"status": "available"})):
            response = TestClient(app).get("/api/complaints?limit=1")

        self.assertEqual(response.status_code, 200)
        item = response.json()["items"][0]
        self.assertEqual(item["id"], "C1")
        self.assertEqual(item["slaRisk"], "HIGH")
        self.assertEqual(item["recommendedQueue"], "Meter & Billing Resolution")
        self.assertEqual(item["nextAction"], "Validate meter reading")
        self.assertTrue(any("estimated read" in reason for reason in item["reasons"]))

    def test_complaint_api_filters_before_pagination_and_sorts_priority(self) -> None:
        complaints = pd.DataFrame(
            {
                "complaint_id": [f"C{index}" for index in range(12)],
                "category": ["Billing"] * 12,
                "region": ["North"] * 12,
                "priority": ["P3", "P1", "P2", "P3", "P1", "P2", "P3", "P3", "P2", "P3", "P1", "P3"],
                "days_open": list(range(12)),
                "source_system": ["SYS-01"] * 12,
                "sla_days": [20] * 12,
                "status": ["Open"] * 12,
                "date_opened": [f"2025-01-{index + 1:02d}" for index in range(12)],
            }
        )
        with patch("app.main.data_loader.load", return_value=({"complaints": complaints}, {"status": "available"})):
            response = TestClient(app).get("/api/complaints?category=Billing&priority=P1&limit=10&sort=priority")
            recent_response = TestClient(app).get("/api/complaints?limit=2&sort=recent")

        body = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(body["total"], 3)
        self.assertEqual(len(body["items"]), 3)
        self.assertTrue(all(item["priority"] == "P1" for item in body["items"]))

        recent_items = recent_response.json()["items"]
        self.assertEqual([item["id"] for item in recent_items], ["C11", "C10"])

    def test_complaint_metrics_and_transfer_comparison(self) -> None:
        complaints = pd.DataFrame(
            {
                "complaint_id": ["C1", "C2", "C3"],
                "category": ["Billing", "Meter", "Billing"],
                "region": ["North", "North", "South"],
                "status": ["Open", "Closed", "Resolved"],
                "resolution_days": [None, 12, 6],
                "sla_breached": [True, False, False],
                "reopened": [False, True, False],
                "transferred": [True, True, False],
            }
        )

        result = analyze_data(
            {"complaints": complaints},
            {"status": "partial", "loadedDatasets": ["complaints"]},
        )

        metrics = result["complaintMetrics"]
        self.assertEqual(metrics["totalCount"], 3)
        self.assertEqual(metrics["currentOpenBacklog"], 1)
        self.assertEqual(metrics["slaBreachRate"], 33.33)
        self.assertEqual(metrics["averageResolutionDays"], 9.0)
        self.assertEqual(metrics["reopeningRate"], 33.33)
        self.assertEqual(metrics["transferRate"], 66.67)
        self.assertEqual(
            metrics["countsByRegion"],
            [{"region": "North", "count": 2}, {"region": "South", "count": 1}],
        )

        transferred = result["transferComparison"]["transferred"]
        not_transferred = result["transferComparison"]["notTransferred"]
        self.assertEqual(transferred["count"], 2)
        self.assertEqual(transferred["averageResolutionDays"], 12.0)
        self.assertEqual(transferred["currentBacklogCount"], 1)
        self.assertEqual(transferred["currentBacklogShare"], 100.0)
        self.assertEqual(not_transferred["count"], 1)
        self.assertEqual(not_transferred["averageResolutionDays"], 6.0)

    def test_missing_data_stays_unknown_and_complaint_keys_are_camel_case(self) -> None:
        result = analyze_data({}, {"status": "unavailable", "loadedDatasets": []})

        self.assertIsNone(result["complaintMetrics"]["totalCount"])
        self.assertIsNone(result["meterBillingByRegion"])
        self.assertIsNone(result["aiPilot"])
        self.assertEqual(complaint_records(None), [])

        rows = complaint_records(pd.DataFrame({"case_id": ["C-1"], "days_open": [4]}))
        self.assertEqual(rows, [{"caseId": "C-1", "daysOpen": 4}])

    def test_meter_and_kpi_metrics_are_derived_from_rows(self) -> None:
        meter_reads = pd.DataFrame(
            {
                "region": ["North", "North", "North"],
                "meter_id": ["M1", "M2", "M3"],
                "read_type": ["estimated", "actual", "estimated"],
                "meter_type": ["smart", "traditional", "smart"],
                "billing_exception": [True, False, False],
            }
        )
        complaints = pd.DataFrame(
            {
                "region": ["North", "North", "North"],
                "category": ["Meter reading", "Other", "Billing - estimated read"],
            }
        )
        monthly = pd.DataFrame(
            {
                "month": ["2025-01"],
                "complaint_volume": [120],
                "average_resolution_days": [8.5],
                "first_contact_resolution_rate": [72],
                "cost_to_serve": [45.2],
                "regulator_score": [81],
            }
        )
        result = analyze_data(
            {"meterReads": meter_reads, "complaints": complaints, "monthlyKpis": monthly},
            {"status": "partial", "loadedDatasets": []},
        )

        regional = result["meterBillingByRegion"][0]
        self.assertEqual(regional["estimatedReadRate"], 66.67)
        self.assertEqual(regional["smartMeterPenetration"], 66.67)
        self.assertEqual(regional["billingExceptions"], 1)
        self.assertEqual(regional["meterComplaintCount"], 2)
        self.assertEqual(regional["meterComplaintShare"], 66.67)
        self.assertEqual(result["kpiTrends"][0]["complaintVolume"], 120)
        self.assertEqual(result["kpiTrends"][0]["regulatorScore"], 81)
