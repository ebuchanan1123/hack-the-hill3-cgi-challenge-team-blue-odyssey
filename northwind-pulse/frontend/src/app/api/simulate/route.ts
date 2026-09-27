import { proxyBackendJson, readJsonBody } from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body instanceof Response) return body;
  return proxyBackendJson("/api/simulate", body);
}
