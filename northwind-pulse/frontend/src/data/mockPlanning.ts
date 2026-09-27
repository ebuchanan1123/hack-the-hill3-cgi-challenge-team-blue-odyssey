import type { ComplaintStatus, EvidenceValue, Metric, MockPlan } from "@/types/pulse";
export const mockStatuses: Record<string, ComplaintStatus> = { "COMP-1001": "Awaiting meter reading", "COMP-1002": "In review", "COMP-1003": "Open", "COMP-1004": "In review", "COMP-1005": "Open", "COMP-1006": "Open", "COMP-1007": "Awaiting meter reading" };
export const mockDashboardMetrics: Metric[] = [
  { label: "Open complaints", value: "7", trend: [11, 10, 10, 9, 8, 7], change: "4 fewer than prior period", improving: true },
  { label: "High-risk bills", value: "3", trend: [1, 2, 2, 2, 3, 3], change: "2 more than prior period", improving: false },
  { label: "Transferred complaints", value: "42%", trend: [47, 46, 46, 44, 43, 42], change: "5 pts lower than prior period", improving: true },
  { label: "Avg. time to resolve", value: "38.2 days", trend: [41.6, 41, 40.1, 39.5, 38.9, 38.2], change: "3.4 days faster", improving: true },
];
const estimatedReads: EvidenceValue[] = [
  { label: "Barrowdale bills using estimated reads", value: "64%", source: "Northwind data" },
  { label: "Dunmoor bills using estimated reads", value: "59%", source: "Northwind data" },
];
const transfers: EvidenceValue[] = [
  { label: "Time to resolve, not transferred", value: "23 days", source: "Northwind data" },
  { label: "Time to resolve, transferred", value: "38 days", source: "Northwind data" },
  { label: "Extra time when a complaint is transferred", value: "+15 days", source: "Calculated" },
  { label: "Extra cost per transferred complaint", value: "+$53", source: "Calculated" },
];
const complaintReduction: EvidenceValue = { label: "Expected drop in complaints", value: "20%", source: "Scenario assumption" };
const handlingCost: EvidenceValue = { label: "Cost to handle a complaint", value: "$68", source: "Northwind data" };
const transferCost: EvidenceValue = { label: "Cost to handle a transferred complaint", value: "$121", source: "Northwind data" };
const meterCost: EvidenceValue = { label: "Smart meter installation (per meter)", value: "$148", source: "Northwind data" };
export const mockPlans: MockPlan[] = [
  { id: "balanced", title: "Balanced intervention", rationale: "Best fit for the current $3M / 12-month objective.", items: [{ name: "Risk-based bill validation", investment: "$900K" }, { name: "Transfer reduction", investment: "$1.1M" }, { name: "Targeted smart meters", investment: "$1.0M" }], summary: [{ label: "Investment", value: "$3.0M" }, { label: "Projected savings", value: "$1.8M / year" }, { label: "Complaints avoided", value: "2,350 / year" }, { label: "Payback period", value: "20 months" }], assumptions: [complaintReduction, handlingCost, transferCost, meterCost], evidence: [...estimatedReads, ...transfers] },
  { id: "validation", title: "Validation pilot", rationale: "Lowest-cost starting point for a $500K budget.", items: [{ name: "Risk-based bill validation", investment: "$500K" }], summary: [{ label: "Investment", value: "$500K" }, { label: "Projected savings", value: "$720K / year" }, { label: "Complaints avoided", value: "1,800 / year" }, { label: "Payback period", value: "8.3 months" }], assumptions: [complaintReduction, handlingCost], evidence: estimatedReads },
];
export const mockQuestions = ["What if our budget is $500k?", "Why not replace every meter?", "Which region should we pilot first?"];
export const mockResponses = [
  { question: "What if our budget is $500k?", planId: "validation" },
  { question: "Why not replace every meter?", planId: "balanced" },
  { question: "Which region should we pilot first?", planId: "balanced" },
];
export function getMockResponse(question: string) {
  const response = mockResponses.find(item => item.question.toLowerCase() === question.trim().toLowerCase());
  return { plan: mockPlans.find(plan => plan.id === response?.planId) ?? mockPlans[0] };
}
