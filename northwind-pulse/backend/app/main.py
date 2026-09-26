"""Health check only; product endpoints will follow the frozen API contract."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Northwind Pulse API", version="0.1.0")


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["northwind-pulse-backend"] = "northwind-pulse-backend"


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health() -> HealthResponse:
    return HealthResponse()
