"""User brief and constrained Gemini proposal model for strategy generation."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.scenarios import InterventionId


class StrategyGenerationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    budgetUsd: float = Field(gt=0, le=100_000_000)
    horizonMonths: int = Field(default=36, ge=1, le=120)
    objective: Literal["maximizeNetSavings", "maximizeRoi", "minimizePayback"] = "maximizeNetSavings"
    annualOperatingCostUsd: float = Field(default=0, ge=0, le=100_000_000)
    portfolioOverlapPercent: float = Field(default=25, ge=0, le=100)
    priorities: str = Field(default="", max_length=1000, description="Optional priorities or constraints for the generated recommendation")


class GeminiStrategyRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: InterventionId
    allocationPercent: float = Field(gt=0, le=100, description="Suggested share of the available budget for this intervention")
    rationale: str = Field(min_length=1, max_length=500)


class GeminiStrategyDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=120)
    summary: str = Field(min_length=1, max_length=1200)
    recommendedInterventions: list[GeminiStrategyRecommendation] = Field(min_length=1, max_length=4)
    caveats: list[str] = Field(max_length=5)

    @model_validator(mode="after")
    def validate_unique_interventions(self) -> "GeminiStrategyDraft":
        ids = [item.id for item in self.recommendedInterventions]
        if len(ids) != len(set(ids)):
            raise ValueError("Gemini must recommend each intervention at most once")
        return self
