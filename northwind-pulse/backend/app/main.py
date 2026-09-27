"""Northwind Pulse deterministic data API."""

from typing import Literal

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from app.models.ask_pulse import AskPulseRequest, AskPulseResponse
from app.models.scenarios import StrategySimulationRequest
from app.models.strategy_generation import StrategyGenerationRequest
from app.models.workflow import AccountReviewUpdate, ComplaintWorkflowUpdate
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
from app.services.strategy_generator import StrategyDataUnavailableError, generate_investment_strategy
from app.services.workflow import get_account_review, merge_complaint_update, save_account_review, save_complaint_update

app = FastAPI(title="Northwind Pulse API", version="0.1.0")
data_loader = CSVDataLoader()


def _complaint_age_days(frame):
    opened = pd.to_datetime(frame["date_opened"], errors="coerce") if "date_opened" in frame.columns else pd.Series(index=frame.index, dtype="float64")
    reference = opened.max()
    ages = pd.to_numeric(frame.get("days_to_close"), errors="coerce") if "days_to_close" in frame.columns else pd.Series(index=frame.index, dtype="float64")
    open_mask = frame.get("status", pd.Series(index=frame.index, dtype="string")).astype(str).str.lower().eq("open")
    if pd.notna(reference):
        ages = ages.where(~open_mask, (reference - opened).dt.days)
    return ages


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
    search: str | None = Query(default=None, max_length=200),
    category: str | None = Query(default=None, max_length=120),
    region: str | None = Query(default=None, max_length=120),
    priority: str | None = Query(default=None, max_length=20),
    status: str | None = Query(default=None, max_length=40),
    sort: str = Query(default="recent", pattern="^(recent|status|priority|deadline)$"),
    deadline: str | None = Query(default=None, max_length=20),
) -> dict:
    frames, availability = data_loader.load()
    frame = frames.get("complaints")
    filtered = frame.copy() if frame is not None else None
    if filtered is not None:
        text = filtered.astype(str).agg(" ".join, axis=1).str.lower()
        if search:
            filtered = filtered.loc[text.str.contains(search.strip().lower(), regex=False, na=False)]
        if category:
            filtered = filtered.loc[filtered["category"].astype(str).eq(category)]
        if region:
            filtered = filtered.loc[filtered["region"].astype(str).eq(region)]
        if priority:
            filtered = filtered.loc[filtered["priority"].astype(str).eq(priority)]
        if status:
            filtered = filtered.loc[filtered["status"].astype(str).eq(status)]
        complaint_ages = _complaint_age_days(frame).loc[filtered.index]
        if deadline:
            targets = {"P1": 5, "P2": 10, "P3": 20}
            target_days = filtered["priority"].astype(str).map(targets)
            remaining = target_days - complaint_ages
            if deadline == "Overdue":
                filtered = filtered.loc[remaining < 0]
            elif deadline == "Due soon":
                filtered = filtered.loc[remaining.ge(0) & remaining.le(2)]
            elif deadline == "On track":
                filtered = filtered.loc[remaining > 2]
        sort_columns = ["_sort", "date_opened"] if "date_opened" in filtered.columns else ["_sort"]
        sort_ascending = [True, False] if len(sort_columns) == 2 else [True]
        if sort == "status":
            filtered = filtered.assign(_sort=filtered["status"].astype(str).map(lambda value: 0 if value.lower() == "open" else 1)).sort_values(sort_columns, ascending=sort_ascending).drop(columns="_sort")
        elif sort == "priority":
            filtered = filtered.assign(_priority=filtered["priority"].astype(str).map({"P1": 0, "P2": 1, "P3": 2}).fillna(3), _age=complaint_ages).sort_values(["_priority", "_age"], ascending=[True, False]).drop(columns=["_priority", "_age"])
        elif sort == "deadline":
            targets = {"P1": 5, "P2": 10, "P3": 20}
            remaining = filtered["priority"].astype(str).map(targets) - complaint_ages
            filtered = filtered.assign(_sort=remaining).sort_values(sort_columns, ascending=sort_ascending).drop(columns="_sort")
        elif sort == "recent" and "date_opened" in filtered.columns:
            filtered = filtered.sort_values("date_opened", ascending=False)
    total = len(filtered) if filtered is not None else 0
    page = filtered.iloc[offset : offset + limit] if filtered is not None else None
    records = complaint_records(page)
    enriched: list[dict] = []
    route_context_cache: dict[str, dict[tuple[object, ...], object]] = {}
    page_ages = _complaint_age_days(frame).loc[page.index].tolist() if page is not None else []
    for record, age in zip(records, page_ages):
        routed = route_complaint(
            {
                "id": record.get("id", "unknown"),
                "category": record.get("category", "Unknown"),
                "region": record.get("region", "Unknown"),
                "priority": record.get("priority", "P3"),
                "daysOpen": age if pd.notna(age) else record.get("daysToClose", 0) or 0,
                "sourceSystem": record.get("sourceSystem"),
                "slaDays": record.get("slaDays"),
            },
            frames,
            route_context_cache,
        )
        enriched.append(merge_complaint_update({**record, **routed, "status": record.get("workflowStatus", record.get("status"))}))
    return {
        "items": enriched,
        "total": total,
        "offset": offset,
        "limit": limit,
        "sort": sort,
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
    return merge_complaint_update(complaint_records(matching)[0])


@app.patch("/api/complaints/{complaint_id}/workflow", tags=["Complaint resolution"])
def update_complaint_workflow(complaint_id: str, request: ComplaintWorkflowUpdate) -> dict:
    frames, _ = data_loader.load()
    frame = frames.get("complaints")
    if frame is None or not frame["complaint_id"].astype(str).eq(complaint_id).any():
        raise HTTPException(status_code=404, detail="Complaint not found")
    if request.status == "Resolved" and not request.resolutionType:
        raise HTTPException(status_code=422, detail="Resolution type is required when resolving a complaint")
    saved = save_complaint_update(complaint_id, request.model_dump(exclude_none=True))
    return {"id": complaint_id, **saved, "message": "Resolution feedback saved for future prevention and routing."}


@app.patch("/api/accounts/{account_id}/review", tags=["Prevention"])
def update_account_review(account_id: str, request: AccountReviewUpdate) -> dict:
    saved = save_account_review(account_id, request.model_dump(exclude_none=True))
    return {"accountId": account_id, **saved, "message": "Pre-bill review outcome saved as prevention feedback."}


@app.get("/api/accounts/{account_id}/review", tags=["Prevention"])
def account_review(account_id: str) -> dict:
    return {"accountId": account_id, **(get_account_review(account_id) or {})}


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


@app.post("/api/strategy/generate", tags=["Investment scenarios"])
def generate_strategy(request: StrategyGenerationRequest) -> dict:
    frames, availability = data_loader.load()
    try:
        return generate_investment_strategy(frames, availability, request)
    except StrategyDataUnavailableError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except GeminiNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail="Gemini is not configured on this backend") from exc
    except GeminiServiceError as exc:
        raise HTTPException(status_code=502, detail="Gemini could not propose a valid strategy; please retry") from exc


@app.post("/api/ask-pulse", response_model=AskPulseResponse, tags=["Ask Pulse"])
def ask_pulse(request: AskPulseRequest) -> AskPulseResponse:
    frames, availability = data_loader.load()
    try:
        return answer_question(request.question, frames, availability)
    except GeminiNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail="Gemini is not configured on this backend") from exc
    except GeminiServiceError as exc:
        raise HTTPException(status_code=502, detail="Gemini could not produce a valid answer; please retry") from exc
