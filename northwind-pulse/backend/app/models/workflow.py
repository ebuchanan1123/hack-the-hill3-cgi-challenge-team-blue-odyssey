"""Validated workflow updates for the judge-facing demo."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ComplaintWorkflowStatus = Literal["Open", "In progress", "Resolved"]
ResolutionType = Literal["Bill corrected", "Meter reading confirmed", "Information provided", "Escalated", "Other"]
TransferOutcome = Literal["Not transferred", "Transfer avoided", "Transferred successfully"]
AccountReviewAction = Literal["Cleared for billing", "Held for validation", "Meter reading requested", "Escalated for manual review"]


class ComplaintWorkflowUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ComplaintWorkflowStatus
    resolutionType: ResolutionType | None = None
    rootCause: str | None = Field(default=None, max_length=300)
    billCorrected: bool | None = None
    meterVisitRequired: bool | None = None
    transferOutcome: TransferOutcome | None = None
    notes: str | None = Field(default=None, max_length=1000)


class AccountReviewUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: AccountReviewAction
    correctedUsageKwh: float | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=1000)
