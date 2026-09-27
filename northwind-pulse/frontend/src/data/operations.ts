import { mockAccounts, mockUsageHistory } from "./mockAccounts";
import { mockComplaints } from "./mockComplaints";
import { mockDashboardMetrics, mockStatuses } from "./mockPlanning";
import { getDeadline } from "@/lib/deadline";
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

export async function getLiveOperationsData(offset = 0, limit = 10, params = ""): Promise<OperationsData> {
  const [complaintsResponse, metricsResponse] = await Promise.all([
    fetch(`${backendUrl}/api/complaints?offset=${offset}&limit=${limit}${params}`, { cache: "no-store" }),
    fetch(`${backendUrl}/api/metrics`, { cache: "no-store" }),
  ]);
  if (!complaintsResponse.ok || !metricsResponse.ok) throw new Error("Live operations data unavailable");
  const complaintsBody = (await complaintsResponse.json()) as { items?: Complaint[]; total?: number; offset?: number; limit?: number };
  const overdueResponse = await fetch(`${backendUrl}/api/complaints?limit=1&status=Open&deadline=Overdue`, { cache: "no-store" });
  const overdueBody = overdueResponse.ok ? await overdueResponse.json() as { total?: number } : { total: 0 };
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
  return { accounts: mockAccounts, complaints, usageHistory: mockUsageHistory, metrics, statuses, complaintTotal: complaintsBody.total ?? complaints.length, complaintOffset: complaintsBody.offset ?? offset, complaintLimit: complaintsBody.limit ?? limit, openOverdueCount: overdueBody.total ?? 0 };
}

/** Use live aggregate/complaint data when the backend is available; retain fixtures for offline demo startup. */
export async function getOperationsData(offset = 0, limit = 10, params = ""): Promise<OperationsData> {
  try {
    return await getLiveOperationsData(offset, limit, params);
  } catch {
    return { accounts: mockAccounts, complaints: mockComplaints.slice(offset, offset + limit), usageHistory: mockUsageHistory, metrics: mockDashboardMetrics, statuses: mockStatuses, complaintTotal: mockComplaints.length, complaintOffset: offset, complaintLimit: limit, openOverdueCount: mockComplaints.filter((complaint) => mockStatuses[complaint.id] === "Open" && getDeadline(complaint)?.state === "Overdue").length };
  }
}
