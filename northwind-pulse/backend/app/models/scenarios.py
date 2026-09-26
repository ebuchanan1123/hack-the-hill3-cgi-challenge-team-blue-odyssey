"""Validated input models for user-configurable investment strategies."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


ConfidenceInputs = Literal["conservative", "base", "upside"]
InterventionId = Literal[
    "targeted-validation",
    "meterhub-improvement",
    "targeted-smart-meter-deployment",
    "transfer-integration-improvement",
]


class ReductionAssumptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conservative: float = Field(ge=0, le=100, description="Conservative annual impact assumption, percent")
    base: float = Field(ge=0, le=100, description="Base annual impact assumption, percent")
    upside: float = Field(ge=0, le=100, description="Upside annual impact assumption, percent")

    @model_validator(mode="after")
    def validate_confidence_order(self) -> "ReductionAssumptions":
        if not self.conservative <= self.base <= self.upside:
            raise ValueError("Reduction assumptions must satisfy conservative ≤ base ≤ upside")
        return self


class StrategyInterventionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: InterventionId
    investmentUsd: float = Field(gt=0, description="One-time implementation investment in USD")
    annualOperatingCostUsd: float = Field(default=0, ge=0, description="Annual recurring operating cost in USD")
    reductionPercent: ReductionAssumptions = Field(description="User-supplied impact assumptions by confidence case")


class StrategySimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    budgetUsd: float = Field(gt=0, description="Maximum available one-time investment in USD")
    horizonMonths: int = Field(default=36, ge=1, le=120)
    objective: Literal["maximizeNetSavings", "maximizeRoi", "minimizePayback"] = "maximizeNetSavings"
    portfolioOverlapPercent: float = Field(
        default=25,
        ge=0,
        le=100,
        description="Assumed benefit reduction for each additional selected intervention due to overlapping complaint cohorts",
    )
    interventions: list[StrategyInterventionInput] = Field(min_length=1, max_length=4)

    @model_validator(mode="after")
    def validate_intervention_selection(self) -> "StrategySimulationRequest":
        ids = [intervention.id for intervention in self.interventions]
        if len(ids) != len(set(ids)):
            raise ValueError("Intervention IDs must be unique")
        return self
