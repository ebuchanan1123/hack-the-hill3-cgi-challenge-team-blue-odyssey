import { proxyBackendPatch, readJsonBody } from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ complaintId: string }> }) {
  const body = await readJsonBody(request);
  if (body instanceof Response) return body;
  const { complaintId } = await context.params;
  return proxyBackendPatch(`/api/complaints/${encodeURIComponent(complaintId)}/workflow`, body);
}