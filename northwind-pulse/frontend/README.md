# Northwind Pulse frontend

Simplified, mock-only utility workspace. All implementation changes remain in
`frontend/`; backend and shared contracts are untouched.

## Run

Node.js 20.9+ and npm are required.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/dashboard. No environment variables or API keys.

## Routes

- `/dashboard`: four compact KPIs, pre-bill review, recent complaints.
- `/complaints`: search, category/region/priority/status/SLA filters, detail drawer.
- `/decision-twin`: Ask Pulse, fixed structured plans, assumptions/evidence/compare drawers.
- `/` and `/operations`: redirect to `/dashboard`.

No Intelligence/Insights page, authentication, backend calls, or Gemini connection.

## Components and files

- `src/components/pulse/app-sidebar.tsx`: three-item persistent navigation.
- `src/components/pulse/shared.tsx`: PageHeader, MetricCard, RiskBadge,
  ExplainButton, accessible EvidenceDrawer.
- `src/components/operations/dashboard.tsx`: Dashboard.
- `src/components/operations/complaints.tsx`: Complaints and filtering.
- `src/components/operations/operations-tables.tsx`: account and complaint tables.
- `src/components/operations/detail-sheets.tsx`: concise account/complaint drawers.
- `src/components/operations/usage-chart.tsx`: synthetic history and accessible table.
- `src/components/planning/decision-twin.tsx`: Ask Pulse and result drawers.
- `src/data/mockPlanning.ts`: statuses, aggregate examples, fixed scenario fixtures,
  and exact-match demonstration responses.
- `src/data/mockAccounts.ts`, `mockComplaints.ts`, `operations.ts`: typed queue fixtures
  and the replaceable data boundary.
- `src/types/pulse.ts`: unchanged wire shapes plus separate frontend context types.
- `src/app/globals.css`: simplified responsive styling.

The old Operations tab workspace, hero, process stepper, promotional rail, and
footer were removed. Existing Operations loading/error files were removed with
that workspace. The legacy URL remains a redirect, not a fourth product page.

## Mock behavior and provenance

Accounts and their monthly histories are synthetic. Complaint records and statuses
are illustrative. Aggregates are examples supplied in the brief, not verified
Northwind findings. KPI information controls disclose scope and source.

Financial outputs are fixed display strings, not frontend calculations. Suggestion
chips select fixed responses; other text shows an explicitly labelled fixed $3M
example. No prompt, customer data, or scenario output leaves the app.

The intended future flow is private data → internal Pulse engine → sanitized,
aggregated scenario outputs → Gemini explanation. The UI describes that access
as planned. Gemini is not a calculation engine.

## Contract questions for integration

No contract change is needed for this mock demonstration. Before integration:

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
3. Ask Pulse needs an agreed sanitized portfolio response, provenance for each
   assumption/evidence value, units/currency, and deterministic backend outputs.
   `MockPlan` is a frontend presentation fixture, not a proposed replacement for
   the frozen investment scenario contract.
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
redirects, search and combined filters, focus management, drawers, scenario
selection, unknown-question disclosure, and mobile overflow. Screenshots are
written to ignored `artifacts/`.

## Visual polish pass

Northwind blue accents, off-white page surfaces, compact KPI cards, status badges,
and a default Decision Twin recommendation refine the existing three-page layout.
Data/AI provenance is available through keyboard-accessible information controls
in the page headers and relevant drawers rather than always-visible demo labels.
The complaint drawer is grouped into Overview, Risk, Routing, and Why.
No mock payloads, financial formulas, backend integration, or contracts changed.

Files touched in this pass: `src/app/globals.css`,
`src/components/pulse/shared.tsx`, `src/components/operations/dashboard.tsx`,
`complaints.tsx`, `operations-tables.tsx`, `detail-sheets.tsx`, `usage-chart.tsx`,
`src/components/planning/decision-twin.tsx`, `tests/operations.spec.ts`, and this README.
