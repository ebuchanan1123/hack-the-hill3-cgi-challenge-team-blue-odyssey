import type { ComplaintStatus, EvidenceValue, MockPlan } from "@/types/pulse";
export const mockStatuses: Record<string, ComplaintStatus> = { "COMP-1001": "Awaiting meter reading", "COMP-1002": "In review", "COMP-1003": "Open", "COMP-1004": "In review", "COMP-1005": "Open", "COMP-1006": "Open", "COMP-1007": "Awaiting meter reading" };
export const mockDashboardMetrics = [
  { label: "Open complaints", value: "7" },
  { label: "High-risk bills", value: "3" },
  { label: "Transferred complaints", value: "42%" },
  { label: "Avg. time to resolve", value: "38.2 days" },
];
const evidence: EvidenceValue[] = [
  { label: "Barrowdale bills using estimated reads", value: "64%", source: "Illustrative aggregate" },
  { label: "Dunmoor bills using estimated reads", value: "59%", source: "Illustrative aggregate" },
  { label: "Time to resolve, not transferred", value: "23 days", source: "Illustrative aggregate" },
  { label: "Time to resolve, transferred", value: "38 days", source: "Illustrative aggregate" },
];
const assumptions: EvidenceValue[] = [
  { label: "Expected drop in complaints", value: "20%", source: "Scenario assumption" },
  { label: "Cost to handle a complaint", value: "$68", source: "Scenario assumption" },
  { label: "Cost to handle a transferred complaint", value: "$121", source: "Scenario assumption" },
  { label: "Smart meter install (per meter)", value: "$148", source: "Scenario assumption" },
];
export const mockPlans: MockPlan[] = [
  { id: "balanced", title: "Balanced intervention", items: [{ name: "Risk-based bill validation", investment: "$900K" }, { name: "Transfer reduction", investment: "$1.1M" }, { name: "Targeted smart meters", investment: "$1.0M" }], summary: [{ label: "Investment", value: "$3.0M" }, { label: "Projected savings", value: "$1.8M / year" }, { label: "Complaints avoided", value: "2,350 / year" }, { label: "Payback period", value: "20 months" }], assumptions, evidence },
  { id: "validation", title: "Validation pilot", items: [{ name: "Risk-based bill validation", investment: "$500K" }], summary: [{ label: "Investment", value: "$500K" }, { label: "Projected savings", value: "$720K / year" }, { label: "Complaints avoided", value: "1,800 / year" }, { label: "Payback period", value: "8.3 months" }], assumptions, evidence },
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
