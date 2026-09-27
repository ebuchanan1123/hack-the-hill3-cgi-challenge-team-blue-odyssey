# Architecture and ownership

Northwind Pulse is a complaint intelligence platform for a fictional utility.
Its operating model is **PREVENT → RESOLVE → LEARN → INVEST**.

## Initialization boundary

The frontend Operations, Complaints, Decision Twin, and Ask Pulse surfaces are
implemented. Operations and Complaints consume backend complaint and aggregate
metric APIs when available; synthetic account-risk data remains a demo boundary.
The backend loads the supplied Northwind datasets and exposes deterministic
analysis, routing, prevention, and investment-calculation endpoints.

## Independent development

- Frontend developer owns `frontend/`, including its dependencies, styles, UI,
  TypeScript contracts, mock fixtures, and future data access functions.
- Backend developer owns `backend/`, including its dependencies, API, dataset
  analysis, validation, and deterministic financial calculations.
- `docs/` contains the frozen shared contract and architecture decisions. Coordinate
  contract changes explicitly before changing them or either implementation.
- Do not edit the other developer's directory without explicit instruction.
- Each service has independent installation and run commands. There is no shared
  runtime package, root package manager workspace, or cross-directory code import.

## Future data boundary

When product work is authorized, UI components will receive typed data from
frontend-owned data access functions. Those functions initially return mock fixtures
matching `API_CONTRACT.md`. Replace the functions with API calls later without
changing presentation components. Keep any TypeScript types in `frontend/` and
Pydantic models in `backend/`; the documented contract is the shared reference.

The health page checks only frontend rendering and does not require a running backend.
The backend `/health` endpoint reports API process liveness. Server-side frontend
data access uses `NORTHWIND_BACKEND_URL`, with fixture fallback for offline demo
startup. Gemini credentials remain backend-only.

## Product constraints for later implementation

- Operations covers prevention of risky estimated bills and complaint resolution.
- Intelligence uses supplied challenge datasets and separates measured relationships
  from causal claims. Do not present illustrative examples as verified findings.
- Decision Twin compares investment, complaints avoided, savings, payback, and
  assumptions. Financial outputs must use deterministic backend calculations.
  An LLM may interpret language or explain results, never calculate financial values.
- Account consumption histories and prevention risk accounts are synthetic demo data;
  the challenge dataset does not contain individual consumption history.
- Every recommendation needs a “Why?” interaction; financial metrics need a
  “View calculation” interaction. Expose reasons, assumptions, and provenance.
- Use an off-white background, navy text, restrained blue, amber warnings,
  serious-risk red, positive-outcome green, whitespace, subtle borders, and motion.
- Prioritize a stable demo. Do not add authentication, databases, Docker,
  microservices, Redux, Kubernetes, or unrelated features.

## Stack references

- [Next.js setup](https://nextjs.org/docs/app/getting-started/installation)
- [shadcn/ui setup](https://ui.shadcn.com/docs/installation/manual)
- [FastAPI basics](https://fastapi.tiangolo.com/tutorial/first-steps/)
