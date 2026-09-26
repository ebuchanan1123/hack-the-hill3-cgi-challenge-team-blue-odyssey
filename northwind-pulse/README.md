# Northwind Pulse

Initialization only: a Next.js health page and a FastAPI health endpoint.
Product screens require confirmation before implementation.

```text
northwind-pulse/
├── frontend/                 # Frontend developer owns this directory
│   ├── src/app/              # App Router health page, layout, and global styles
│   ├── src/components/ui/    # shadcn/ui components
│   ├── src/lib/              # UI utilities
│   ├── components.json       # shadcn/ui configuration
│   ├── package.json
│   └── package-lock.json
├── backend/                  # Backend developer owns this directory
│   ├── app/main.py           # GET /health
│   ├── requirements.in       # Direct runtime dependencies
│   ├── requirements.txt      # Pinned resolved dependencies
│   └── README.md
└── docs/
    ├── API_CONTRACT.md       # Frozen payload shapes and supplied examples
    └── ARCHITECTURE.md       # Ownership, integration plan, and constraints
```

## Frontend

Requires Node.js 20.9+ and npm; verified with Node.js 24.
From the repository root, in its own terminal:

```sh
cd northwind-pulse/frontend
npm ci
npm run dev
```

Open http://localhost:3000. No backend connection is needed.

Installed stack: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui,
Recharts, Lucide icons, and Framer Motion.

Checks: `npm run lint`, `npm run typecheck`, and `npm run build`.
Production preview: `npm run build` followed by `npm start`.

## Backend

Requires Python 3.10+; verified with Python 3.10.
From the repository root, in a separate terminal:

```sh
cd northwind-pulse/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

On Windows, activate with `.venv\Scripts\activate` instead.

Open http://localhost:8000/health, or check with:

```sh
curl --fail http://localhost:8000/health
```

Expected response:

```json
{"status":"ok","service":"northwind-pulse-backend"}
```

Interactive API docs: http://localhost:8000/docs.
Installed stack: FastAPI, pandas, Pydantic, and Uvicorn.

## Environment and collaboration

No environment variables, API keys, external services, or datasets are required
for either health check. Dependencies and local build artifacts are ignored by Git.

Keep frontend changes inside `frontend/` and backend changes inside `backend/`.
Coordinate any changes to the frozen [API contract](docs/API_CONTRACT.md).
See [architecture notes](docs/ARCHITECTURE.md) for the mock-to-API integration plan,
data provenance requirements, and deterministic financial calculation rules.

Development and production builds use the supported Next.js Webpack option.
Turbopack encountered local process/port restrictions during setup; Webpack
passed the production build. No external font downloads are required.
