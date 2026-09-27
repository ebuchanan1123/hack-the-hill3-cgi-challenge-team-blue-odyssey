# Northwind Pulse frontend

Utility operations workspace with a live Decision Twin integration. Dashboard
and complaints views still use prototype fixtures; Decision Twin calls the
backend for grounded Ask Pulse answers and AI-proposed, deterministically scored
investment strategies.

## Run

Node.js 20.9+ and npm are required.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/dashboard. The frontend proxies Decision Twin requests
to `http://127.0.0.1:8000` by default, keeping Gemini credentials on the backend.
Set `NORTHWIND_BACKEND_URL` in the Next.js server environment when the backend is
running elsewhere. Start the backend separately; see [backend setup](../backend/README.md).

For live Ask Pulse and investment strategies, start the backend in a second
terminal from `backend/` with `python -m uvicorn app.main:app --reload --port 8000`.
The dashboard and complaints pages remain prototype fixtures; Decision Twin is
connected to the backend.

## Routes

- `/dashboard`: four compact KPIs, pre-bill review, recent complaints.
- `/complaints`: search, category/region/priority/status/SLA filters, detail drawer.
- `/decision-twin`: investment strategy generator with Ask Pulse available from a floating bottom-corner launcher.
- `/` and `/operations`: redirect to `/dashboard`.

No authentication or standalone Intelligence/Insights page.

## Components and files

- `src/components/pulse/app-sidebar.tsx`: three-item persistent navigation.
- `src/components/pulse/shared.tsx`: PageHeader, MetricCard, RiskBadge,
  ExplainButton, accessible EvidenceDrawer.
- `src/components/operations/dashboard.tsx`: Dashboard.
- `src/components/operations/complaints.tsx`: Complaints and filtering.
- `src/components/operations/operations-tables.tsx`: account and complaint tables.
- `src/components/operations/detail-sheets.tsx`: concise account/complaint drawers.
- `src/components/operations/usage-chart.tsx`: synthetic history and accessible table.
- `src/components/planning/decision-twin.tsx`: Decision Twin composition.
- `src/components/planning/ask-pulse.tsx`: live question, evidence, caveats, and follow-ups.
- `src/components/planning/investment-strategy.tsx`: planning brief and generated strategy results.
- `src/app/api/ask-pulse/route.ts`, `src/app/api/strategy/generate/route.ts`: same-origin server-side proxies.
- `src/lib/backend-proxy.ts`: backend URL, timeout, and JSON/error handling.
- `src/data/mockPlanning.ts`: remaining illustrative dashboard metrics and complaint statuses.
- `src/data/mockAccounts.ts`, `mockComplaints.ts`, `operations.ts`: typed queue fixtures
  and the replaceable data boundary.
- `src/types/pulse.ts`: API request/response contracts and separate frontend context types.
- `src/app/globals.css`: simplified responsive styling.

The old Operations tab workspace, hero, process stepper, promotional rail, and
footer were removed. Existing Operations loading/error files were removed with
that workspace. The legacy URL remains a redirect, not a fourth product page.

## Data sources and provenance

Accounts and their monthly histories are synthetic. Dashboard metrics, complaint
records, and complaint statuses remain illustrative. Decision Twin calculations
and evidence are returned by the backend using the supplied Northwind CSVs plus
the planning brief. User-supplied budget, annual operating-cost budget, and
overlap are inputs; Gemini proposes the available intervention mix and budget
shares. The impact range is a visible backend planning assumption, not a
Northwind-measured effect.

Ask Pulse calls the backend with the question. The backend sends only selected
aggregate evidence to Gemini and returns evidence records with their source and
period; individual complaint rows and account-level histories are not sent.
For strategy generation, Gemini proposes supported intervention options and
allocation shares; the backend computes dollar amounts, ROI, and payback. Gemini
does not route complaints or calculate financial outputs. The browser never
receives or uses the Gemini API key.

## Integration notes

1. Complaint status is absent from the frozen wire payload. Agree enum semantics
   and a status field or separate status response. Current separate frontend map:

```json
{
  "COMP-1001": "Awaiting reading",
  "COMP-1002": "In review",
  "COMP-1003": "Open"
}
```

2. A live usage history needs a separate history response (the account contract
   has no history), with units, periods, and provenance.
3. Ask Pulse uses `POST /api/ask-pulse`; the Decision Twin strategy brief uses
   `POST /api/strategy/generate`. The deterministic detailed simulator remains
   available at `POST /api/simulate`. Money is USD.
4. Recent complaints currently use fixture order; the contract has no created date.
   Agree ordering/timestamps before presenting live recency.

## Validation

```sh
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Browser tests use installed Google Chrome and start the built production app on
port 3100. Build first and keep port 3100 free. Tests cover all three routes,
redirects, search and combined filters, focus management, drawers, brief-only
strategy submission with Gemini-proposed options, confidence cases, evidence,
the collapsible Ask Pulse chatbot, and mobile overflow. Screenshots are written
to ignored `artifacts/`.

## Visual polish pass

Northwind blue accents, off-white page surfaces, compact KPI cards, status badges,
and the live Decision Twin refine the existing three-page layout. Data and AI
provenance is shown in evidence panels and keyboard-accessible information
controls. The complaint drawer is grouped into Overview, Risk, Routing, and Why.
