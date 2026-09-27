import { proxyBackendGet } from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
  const limit = Math.min(10, Math.max(1, Number(url.searchParams.get("limit") ?? 10) || 10));
  return proxyBackendGet("/api/complaints", `?offset=${offset}&limit=${limit}`);
}