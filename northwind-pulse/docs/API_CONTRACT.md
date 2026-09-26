# API contract — v1 (frozen)

These payload shapes are the shared baseline for independent development.
Field names and JSON value types are frozen. All shown fields are required.
Do not change the contract without explicit coordination. Product endpoints,
list envelopes, filters, and enum vocabularies beyond the supplied examples
are not yet specified; agree on those before API integration.

Examples below were supplied in the project brief. They are illustrative,
not verified findings from the Northwind challenge datasets. No source dataset
has been supplied to this repository. In particular, prevention accounts are
synthetic demonstration records; scenario values are illustrative assumptions.

Percentages use percentage points (64 means 64%, not 0.64); rates and shares
range from 0 to 100, while deviation can exceed 100. Days and months are
numeric durations, counts are integers, and money fields are numeric amounts.
Currency and financial rounding conventions must be agreed before financial
logic is implemented. Array fields remain arrays, including for one item.

## Implemented health endpoint

`GET /health` on the backend returns HTTP 200 and:

```json
{"status": "ok", "service": "northwind-pulse-backend"}
```

No credentials, request body, or query parameters are required.

## Product payloads (not implemented yet)


The frontend must initially use mocked data matching these structures.

### Complaint

```json
{
  "id": "COMP-1001",
  "category": "Billing - estimated read",
  "region": "Barrowdale",
  "priority": "P2",
  "daysOpen": 17,
  "slaRisk": "HIGH",
  "recommendedQueue": "Meter & Billing Resolution",
  "transferRisk": "HIGH",
  "nextAction": "Validate meter reading",
  "reasons": [
    "Complaint relates to an estimated read",
    "Case is approaching SLA deadline",
    "Similar transferred cases historically resolve more slowly"
  ]
}
```

### Prevent risk account

```json
{
  "accountId": "ACC-18492",
  "expectedUsage": 820,
  "estimatedUsage": 1270,
  "deviationPercent": 55,
  "consecutiveEstimatedReads": 3,
  "previousCorrection": true,
  "risk": "HIGH",
  "recommendedAction": "Validate before billing",
  "reasons": [
    "Usage materially exceeds expected seasonal range",
    "Three consecutive estimated reads",
    "Previous bill correction"
  ]
}
```

These account-level records are synthetic demonstration data because the challenge dataset does not contain individual customer consumption history.

### Regional intelligence

```json
{
  "region": "Barrowdale",
  "estimatedReadRate": 64,
  "smartMeterPenetration": 0,
  "meterComplaintShare": 44,
  "averageResolutionDays": 38.2,
  "transferRate": 42
}
```

### Investment scenario

```json
{
  "id": "targeted-validation",
  "name": "Risk-based bill validation",
  "investment": 500000,
  "complaintsAvoided": 1800,
  "annualSavings": 720000,
  "paybackMonths": 8.3,
  "confidence": "BASE",
  "assumptions": [
    {
      "label": "Complaint reduction",
      "value": "20%"
    }
  ],
  "calculation": [
    "Projected complaints avoided × avoided complaint cost",
    "Operational savings - annual operating cost"
  ]
}
```
