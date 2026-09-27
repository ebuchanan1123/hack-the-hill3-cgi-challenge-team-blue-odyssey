# Backend

Requires Python 3.10+; the API smoke test passed with Python 3.14.5.

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Health: http://localhost:8000/health
Interactive API documentation: http://localhost:8000/docs

This service starts independently of the frontend. `NORTHWIND_DATA_DIR` may point to
the directory containing the source CSVs; by default the loader reads `backend/data/`.
The expected filenames are `northwind_complaints.csv`, `northwind_systems.csv`,
`northwind_monthly_kpis.csv`, `northwind_meter_reads.csv`,
`northwind_ai_pilot_2025.csv`, and `northwind_unit_costs.csv`.

Implemented endpoints:

- `GET /health` — process health.
- `GET /api/metrics` — source availability plus available complaint, transfer,
  meter/billing, KPI, AI pilot, system, and unit-cost facts. Unknown metrics are
  returned as `null`; rates calculated from row-level values are percentages.
- `GET /api/complaints` — source complaint rows with camelCase field names in an
  `items`/`total` envelope and data-availability metadata. Supports `offset`
  (default `0`) and `limit` (default `100`, maximum `1000`).
- `GET /api/complaints/{id}` — one source complaint, or `404` if it is missing.
- `POST /api/route` — deterministic queue, SLA-risk, transfer-risk, next-action,
  and reason recommendations. Historical SLA/transfer performance is derived
  from the complaint file; the category/priority queue rules are explicit.
- `POST /api/prevent/analyze` — explainable score for a synthetic account input.
  It does not use customer history or machine learning.
- `POST /api/simulate` — 12 intervention/confidence comparisons (four interventions
  × conservative/base/upside) based on observed annualized complaint counts and
  Northwind unit costs when called without a body. An optional detailed strategy
  request remains available for deterministic subset optimization.
- `POST /api/strategy/generate` — accepts a short planning brief; Gemini recommends
  data-supported options and budget shares, then the backend calculates all USD
  allocations, savings, ROI, and payback from CSV-derived baselines.
- `POST /api/ask-pulse` — Gemini-generated explanation over selected backend-
  calculated facts, with cited fact IDs resolved by the backend to source values.

Missing or malformed CSV files are reported in `dataAvailability`; the API still
starts and returns the metrics supported by available files. Analytical aliases
cover common CSV header spellings, but final field mapping should be verified
against the challenge CSVs. The supplied files have been checked against their
headers. Meter regional rates and billing exceptions use the latest month in the
meter file; pilot rates are weighted by assistant sessions; system age is measured
against the latest KPI month.

Scenario reductions, deployment shares, and planning investments are assumptions,
not measured causal effects. They are returned with each scenario. The supplied
Northwind event costs are dollar amounts (USD) in the listed units. Operating cost
defaults to zero as a visible simplifying assumption. The transfer/integration
scenario estimates handling-cost difference and does not claim complaints are
avoided.

The brief-only strategy-generation request for `POST /api/strategy/generate` is:

```json
{
  "budgetUsd": 1000000,
  "horizonMonths": 36,
  "objective": "maximizeNetSavings",
  "annualOperatingCostUsd": 25000,
  "portfolioOverlapPercent": 25,
  "priorities": "Prioritize estimated-read issues and a rollout that can scale."
}
```

Gemini may recommend only the four data-supported backend options, explain its
choices, and propose priority-share percentages. The backend rescales shares above
100% (and reports that normalization), derives a conservative implementation-cost
proxy from each option's annual avoidable handling-cost baseline, then enumerates
affordable subsets and selects the best portfolio for each confidence case. The
user budget is a ceiling, not a forced spend amount. Effect cases use explicit
10%/20%/30% server-side assumptions, not model-generated forecasts. Objectives
are `maximizeNetSavings`, `maximizeRoi`, and `minimizePayback`. Northwind event
baselines and per-event savings come from CSVs; annual operating-cost budget and
priority notes are user inputs. The returned result includes the Gemini proposal,
backend-selected portfolio, gross/net annual savings, horizon net benefit, ROI,
simple payback, assumptions, source provenance, and data limitations. Strategies
are approximate planning estimates, not guarantees or measured causal effects. If
no affordable portfolio has positive projected horizon benefit, it recommends no
investment.

The optional detailed `POST /api/simulate` request can still be used when callers
want to explicitly supply each intervention's investment and impact ranges. The
brief-only `/api/strategy/generate` endpoint uses Gemini to propose packages; it
does not need intervention-level inputs from the caller.
Cash flows are held constant over the selected horizon; the calculator does not
discount future cash flows or model inflation, tax, financing, or implementation
ramp-up.

Routing, prevention, and financial calculations remain deterministic. Gemini can
propose strategy options, budget shares, and explanations, but cannot calculate
ROI or savings dollars. Configure `GEMINI_API_KEY` in the git-ignored backend `.env` file, and
optionally set `GEMINI_MODEL` (default `gemini-3.1-flash-lite`). The backend loads
that file at startup. Ask Pulse sends only selected aggregate evidence and uses
`store=false` for Gemini Interactions; no complaint-level rows are sent. The API
returns `503` if the key is missing and `502` if Gemini fails or returns an invalid
structured result. Model-produced evidence IDs are allow-listed against backend
evidence before their values can appear in the response.

The proposed Ask Pulse contract is `POST /api/ask-pulse` with
`{"question":"..."}` and a response containing `question`, `answer`, `evidence`
(each with `id`, `label`, `value`, `source`, optional `period`, and `evidenceType`),
`caveats`, `suggestedFollowUps`, and `grounding`. The frontend Decision Twin
proxies this endpoint server-side; it does not expose the Gemini key to browsers.

Run the backend tests from this directory with `python -m unittest discover -s tests`.

Backend development stays inside this directory. See `../docs/API_CONTRACT.md` and
`../docs/ARCHITECTURE.md` before implementing product endpoints.

`requirements.in` records direct dependency constraints. `requirements.txt` pins the
resolved dependencies; install it for a reproducible environment. When deliberately
upgrading, use a clean virtual environment, install `requirements.in`, verify the
service, then regenerate `requirements.txt` with `python -m pip freeze`.
