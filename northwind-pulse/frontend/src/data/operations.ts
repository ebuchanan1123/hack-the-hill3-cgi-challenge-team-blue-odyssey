import { mockAccounts, mockUsageHistory } from "./mockAccounts";
import { mockComplaints } from "./mockComplaints";
import { mockDashboardMetrics, mockStatuses } from "./mockPlanning";
import type { Complaint, ComplaintStatus, Metric, OperationsData } from "@/types/pulse";

const backendUrl = (process.env.NORTHWIND_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

function toMetric(label: string, value: number | null | undefined, suffix = ""): Metric {
  const display = value === null || value === undefined ? "—" : `${value}${suffix}`;
  const numericValue = typeof value === "number" ? value : 0;
  return { label, value: display, trend: [numericValue, numericValue], change: "Live backend data", improving: true };
}

function normalizeStatus(status: unknown) {
  return (typeof status === "string" && status ? status : "Open") as ComplaintStatus;
}

async function getLiveOperationsData(): Promise<OperationsData> {
  const [complaintsResponse, metricsResponse] = await Promise.all([
    fetch(`${backendUrl}/api/complaints?limit=1000`, { cache: "no-store" }),
    fetch(`${backendUrl}/api/metrics`, { cache: "no-store" }),
  ]);
  if (!complaintsResponse.ok || !metricsResponse.ok) throw new Error("Live operations data unavailable");
  const complaintsBody = (await complaintsResponse.json()) as { items?: Complaint[] };
  const metricsBody = (await metricsResponse.json()) as { complaintMetrics?: Record<string, number | null> };
  const complaints = complaintsBody.items ?? [];
  const complaintMetrics = metricsBody.complaintMetrics ?? {};
  const statuses = Object.fromEntries(complaints.map((complaint) => [complaint.id, normalizeStatus(complaint.status)]));
  const metrics: Metric[] = [
    toMetric("Open complaints", complaintMetrics.currentOpenBacklog),
    mockDashboardMetrics[1],
    toMetric("Transferred complaints", complaintMetrics.transferRate, "%"),
    toMetric("Avg. time to resolve", complaintMetrics.averageResolutionDays, " days"),
  ];
  return { accounts: mockAccounts, complaints, usageHistory: mockUsageHistory, metrics, statuses };
}

/** Use live aggregate/complaint data when the backend is available; retain fixtures for offline demo startup. */
export async function getOperationsData(): Promise<OperationsData> {
  try {
    return await getLiveOperationsData();
  } catch {
    return { accounts: mockAccounts, complaints: mockComplaints, usageHistory: mockUsageHistory, metrics: mockDashboardMetrics, statuses: mockStatuses };
  }
}
