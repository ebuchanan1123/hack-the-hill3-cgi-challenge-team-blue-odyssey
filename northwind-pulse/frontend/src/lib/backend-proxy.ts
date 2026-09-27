const BACKEND_URL = (process.env.NORTHWIND_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

export type BackendEndpoint = "/api/ask-pulse" | "/api/simulate" | "/api/strategy/generate";
export type BackendGetEndpoint = "/api/complaints";

export async function proxyBackendGet(endpoint: BackendGetEndpoint, search: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const upstream = await fetch(`${BACKEND_URL}${endpoint}${search}`, { cache: "no-store", signal: controller.signal });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) return Response.json({ detail: "Backend returned an unexpected response." }, { status: 502 });
    return Response.json(await upstream.json(), { status: upstream.status });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json({ detail: timedOut ? "Backend request timed out. Please try again." : "Backend is unavailable. Start the Northwind Pulse API and retry." }, { status: timedOut ? 504 : 503 });
  } finally {
    clearTimeout(timeout);
  }
}

export async function proxyBackendJson(endpoint: BackendEndpoint, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70_000);
  try {
    const upstream = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return Response.json({ detail: "Backend returned an unexpected response." }, { status: 502 });
    }
    return Response.json(await upstream.json(), { status: upstream.status });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json(
      { detail: timedOut ? "Backend request timed out. Please try again." : "Backend is unavailable. Start the Northwind Pulse API and retry." },
      { status: timedOut ? 504 : 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function readJsonBody(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return Response.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }
}
