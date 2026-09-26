import { CircleCheck } from "lucide-react";

export default function HealthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section
        aria-labelledby="health-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10"
      >
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Northwind Pulse
        </p>
        <h1 id="health-title" className="mt-4 text-3xl font-semibold tracking-tight">
          Frontend is running
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          The project foundation is ready. Product screens will follow after
          initialization is confirmed.
        </p>
        <p className="mt-8 flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CircleCheck aria-hidden="true" className="size-4" />
          Frontend health check passed
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This page confirms frontend rendering only. Check the backend separately
          at its <code>/health</code> endpoint.
        </p>
      </section>
    </main>
  );
}
