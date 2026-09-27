import { proxyLearningSummary } from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function GET() {
  return proxyLearningSummary();
}