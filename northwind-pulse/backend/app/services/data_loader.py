"""Load the six source CSVs without making assumptions about their presence."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import pandas as pd

DATASET_FILES = {
    "complaints": "northwind_complaints.csv",
    "systems": "northwind_systems.csv",
    "monthlyKpis": "northwind_monthly_kpis.csv",
    "meterReads": "northwind_meter_reads.csv",
    "aiPilot": "northwind_ai_pilot_2025.csv",
    "unitCosts": "northwind_unit_costs.csv",
}


class CSVDataLoader:
    """Read available Northwind CSV files from the configured data directory."""

    def __init__(self, data_dir: str | Path | None = None) -> None:
        configured_dir = data_dir or os.environ.get("NORTHWIND_DATA_DIR")
        self.data_dir = (
            Path(configured_dir).expanduser()
            if configured_dir
            else Path(__file__).resolve().parents[2] / "data"
        )

    def load(self) -> tuple[dict[str, pd.DataFrame], dict[str, Any]]:
        frames: dict[str, pd.DataFrame] = {}
        missing: list[str] = []
        errors: list[dict[str, str]] = []

        for dataset, filename in DATASET_FILES.items():
            path = self.data_dir / filename
            if not path.is_file():
                missing.append(filename)
                continue
            try:
                frames[dataset] = pd.read_csv(path)
            except (OSError, UnicodeError, pd.errors.ParserError, pd.errors.EmptyDataError) as exc:
                errors.append({"file": filename, "message": str(exc)})

        if len(frames) == len(DATASET_FILES):
            state = "available"
        elif frames:
            state = "partial"
        else:
            state = "unavailable"

        report = {
            "status": state,
            "dataDirectory": str(self.data_dir),
            "loadedDatasets": list(frames),
            "missingFiles": missing,
            "errors": errors,
        }
        return frames, report
