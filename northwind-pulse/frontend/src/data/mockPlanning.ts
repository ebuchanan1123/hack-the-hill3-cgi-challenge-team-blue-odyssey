import type { ComplaintStatus, Metric } from "@/types/pulse";
export const mockStatuses: Record<string, ComplaintStatus> = { "COMP-1001": "Awaiting meter reading", "COMP-1002": "In review", "COMP-1003": "Open", "COMP-1004": "In review", "COMP-1005": "Open", "COMP-1006": "Open", "COMP-1007": "Awaiting meter reading" };
export const mockDashboardMetrics: Metric[] = [
  { label: "Open complaints", value: "7", trend: [11, 10, 10, 9, 8, 7], change: "4 fewer than prior period", improving: true },
  { label: "High-risk bills", value: "3", trend: [1, 2, 2, 2, 3, 3], change: "2 more than prior period", improving: false },
  { label: "Transferred complaints", value: "42%", trend: [47, 46, 46, 44, 43, 42], change: "5 pts lower than prior period", improving: true },
  { label: "Avg. time to resolve", value: "38.2 days", trend: [41.6, 41, 40.1, 39.5, 38.9, 38.2], change: "3.4 days faster", improving: true },
];
