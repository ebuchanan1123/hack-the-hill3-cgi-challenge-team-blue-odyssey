# Frontend

Requires Node.js 20.9+ and npm (verified with Node.js 24).

```sh
npm ci
npm run dev
```

Open http://localhost:3000 for the frontend health page.
No environment variables or running backend are required.

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

Stack: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Recharts,
Lucide icons, and Framer Motion. shadcn/ui is initialized in `components.json`;
its starter button lives in `src/components/ui/`. Add further components only
when needed. System fonts keep builds independent of external font services.

Frontend development stays inside this directory. Product screens are deferred
until initialization is confirmed. Later, keep mock data and API calls behind
frontend-owned data access functions so UI components consume the same typed
props regardless of source. Match `../docs/API_CONTRACT.md` and label
synthetic or illustrative data explicitly.

Development and production builds use the supported Next.js Webpack option.
Turbopack encountered local process/port restrictions during setup; Webpack
passed the production build. No external font downloads are required.
