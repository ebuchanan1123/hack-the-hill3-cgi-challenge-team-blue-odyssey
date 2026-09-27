import { proxyBackendGet } from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
  const limit = Math.min(10, Math.max(1, Number(url.searchParams.get("limit") ?? 10) || 10));
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  for (const name of ["search", "category", "region", "priority", "status", "sort"]) {
    const value = url.searchParams.get(name);
    if (value) params.set(name, value);
  }
  return proxyBackendGet("/api/complaints", `?${params.toString()}`);
}