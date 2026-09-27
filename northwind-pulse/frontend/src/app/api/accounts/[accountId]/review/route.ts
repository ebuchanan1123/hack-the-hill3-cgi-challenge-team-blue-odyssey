import { proxyBackendPatch, readJsonBody } from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ accountId: string }> }) {
  const body = await readJsonBody(request);
  if (body instanceof Response) return body;
  const { accountId } = await context.params;
  return proxyBackendPatch(`/api/accounts/${encodeURIComponent(accountId)}/review`, body);
}