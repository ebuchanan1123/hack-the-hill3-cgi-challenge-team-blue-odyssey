"""Request and response models for grounded Ask Pulse answers."""

from typing import Literal

from pydantic import BaseModel, Field


class AskPulseRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)


class AskPulseEvidence(BaseModel):
    id: str
    label: str
    value: str
    source: str
    period: str | None = None
    evidenceType: Literal["sourceFact", "derivedMetric", "scenarioAssumption"]


class AskPulseResponse(BaseModel):
    question: str
    answer: str
    evidence: list[AskPulseEvidence]
    caveats: list[str]
    suggestedFollowUps: list[str]
    grounding: Literal["grounded", "insufficientData"]


class GeminiAnswerDraft(BaseModel):
    """Model-only structure; evidence values are resolved by the backend."""

    answer: str = Field(min_length=1, max_length=1200, description="A concise explanation using only supplied evidence values.")
    evidenceIds: list[str] = Field(max_length=12, description="IDs of supplied evidence records that support the answer.")
    suggestedFollowUps: list[str] = Field(max_length=3, description="Up to three useful follow-up questions.")
    insufficientEvidence: bool = Field(description="True if the supplied evidence cannot answer the question.")
