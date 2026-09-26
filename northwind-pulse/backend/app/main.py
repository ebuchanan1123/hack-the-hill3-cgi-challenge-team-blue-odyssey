"""Northwind Pulse deterministic data API."""

from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from app.models.ask_pulse import AskPulseRequest, AskPulseResponse
from app.models.scenarios import StrategySimulationRequest
from app.services.analysis import analyze_data, complaint_records
from app.services.ask_pulse import (
    GeminiNotConfiguredError,
    GeminiServiceError,
    answer_question,
)
from app.services.data_loader import CSVDataLoader
from app.services.prevention import analyze_prevention
from app.services.routing import route_complaint
from app.services.scenarios import simulate_scenarios
from app.services.strategy import build_investment_strategy

app = FastAPI(title="Northwind Pulse API", version="0.1.0")
data_loader = CSVDataLoader()


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["northwind-pulse-backend"] = "northwind-pulse-backend"


class RouteRequest(BaseModel):
    id: str
    category: str
    region: str
    priority: str
    daysOpen: float = Field(ge=0)
    sourceSystem: str | None = None
    slaDays: float | None = Field(default=None, gt=0)


class PreventRequest(BaseModel):
    accountId: str
    expectedUsage: float = Field(gt=0)
    estimatedUsage: float = Field(ge=0)
    consecutiveEstimatedReads: int = Field(ge=0)
    previousCorrection: bool


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health() -> HealthResponse:
    return HealthResponse()


@app.get("/api/metrics", tags=["Northwind data"])
def metrics() -> dict:
    frames, availability = data_loader.load()
    return analyze_data(frames, availability)


@app.get("/api/complaints", tags=["Northwind data"])
def complaints(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
) -> dict:
    frames, availability = data_loader.load()
    frame = frames.get("complaints")
    total = len(frame) if frame is not None else 0
    page = frame.iloc[offset : offset + limit] if frame is not None else None
    records = complaint_records(page)
    return {
        "items": records,
        "total": total,
        "offset": offset,
        "limit": limit,
        "dataAvailability": availability,
    }


@app.get("/api/complaints/{complaint_id}", tags=["Northwind data"])
def complaint(complaint_id: str) -> dict:
    frames, _ = data_loader.load()
    frame = frames.get("complaints")
    if frame is None:
        raise HTTPException(status_code=404, detail="Complaint dataset is unavailable")
    id_col = next((column for column in frame.columns if str(column).lower().replace("_", "") in {"id", "complaintid"}), None)
    if id_col is None:
        raise HTTPException(status_code=503, detail="Complaint ID column is unavailable")
    matching = frame.loc[frame[id_col].astype(str).eq(complaint_id)]
    if matching.empty:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint_records(matching)[0]


@app.post("/api/route", tags=["Complaint resolution"])
def route(request: RouteRequest) -> dict:
    frames, _ = data_loader.load()
    return route_complaint(request.model_dump(), frames)


@app.post("/api/prevent/analyze", tags=["Prevention"])
def prevent_analyze(request: PreventRequest) -> dict:
    return analyze_prevention(request.model_dump())


@app.post("/api/simulate", tags=["Investment scenarios"])
def simulate(request: StrategySimulationRequest | None = None) -> dict:
    frames, availability = data_loader.load()
    if request is not None:
        return build_investment_strategy(frames, availability, request)
    return simulate_scenarios(frames, availability)


@app.post("/api/ask-pulse", response_model=AskPulseResponse, tags=["Ask Pulse"])
def ask_pulse(request: AskPulseRequest) -> AskPulseResponse:
    frames, availability = data_loader.load()
    try:
        return answer_question(request.question, frames, availability)
    except GeminiNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail="Gemini is not configured on this backend") from exc
    except GeminiServiceError as exc:
        raise HTTPException(status_code=502, detail="Gemini could not produce a valid answer; please retry") from exc
