"""Explainable prevention scoring for explicitly synthetic account inputs."""

from __future__ import annotations

from typing import Any


def analyze_prevention(payload: dict[str, Any]) -> dict[str, Any]:
    expected = float(payload["expectedUsage"])
    estimated = float(payload["estimatedUsage"])
    consecutive = int(payload["consecutiveEstimatedReads"])
    previous_correction = bool(payload["previousCorrection"])
    deviation = abs(estimated - expected) / expected * 100

    points = 0
    reasons: list[str] = []
    if estimated > expected and deviation >= 30:
        points += 2
        reasons.append("Estimated usage is at least 30% above expected usage")
    elif estimated < expected and deviation >= 30:
        points += 1
        reasons.append("Estimated usage is materially below expected usage")
    if consecutive >= 3:
        points += 2
        reasons.append(f"{consecutive} consecutive estimated reads")
    elif consecutive > 0:
        points += 1
        reasons.append(f"{consecutive} consecutive estimated read(s)")
    if previous_correction:
        points += 2
        reasons.append("A previous bill correction is recorded")

    risk = "HIGH" if points >= 4 else "MEDIUM" if points >= 2 else "LOW"
    action = {
        "HIGH": "Validate before billing",
        "MEDIUM": "Review the reading pattern before billing",
        "LOW": "Continue standard billing and monitoring",
    }[risk]
    if not reasons:
        reasons.append("No high-risk usage variance, repeated estimated reads, or prior correction was supplied")

    return {
        "accountId": str(payload["accountId"]),
        "expectedUsage": expected,
        "estimatedUsage": estimated,
        "deviationPercent": round(deviation, 2),
        "consecutiveEstimatedReads": consecutive,
        "previousCorrection": previous_correction,
        "risk": risk,
        "recommendedAction": action,
        "reasons": reasons,
        "score": points,
        "dataBasis": "Synthetic request input; no account-level history is present in the Northwind datasets",
    }
