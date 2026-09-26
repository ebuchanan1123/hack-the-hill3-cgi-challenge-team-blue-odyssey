/** Wire shapes mirror the frozen contract. Strings remain open until enums are agreed. */
export interface PreventRiskAccount {
  accountId: string;
  expectedUsage: number;
  estimatedUsage: number;
  deviationPercent: number;
  consecutiveEstimatedReads: number;
  previousCorrection: boolean;
  risk: string;
  recommendedAction: string;
  reasons: string[];
}

export interface Complaint {
  id: string;
  category: string;
  region: string;
  priority: string;
  daysOpen: number;
  slaRisk: string;
  recommendedQueue: string;
  transferRisk: string;
  nextAction: string;
  reasons: string[];
}

/** Frontend demonstration context, separate from API payloads. */
export interface UsagePoint {
  month: string;
  expected: number;
  recorded?: number;
  estimate?: number;
}
export interface OperationsData {
  accounts: PreventRiskAccount[];
  complaints: Complaint[];
  usageHistory: Record<string, UsagePoint[]>;
}

/** Frontend-only status context; deliberately separate from Complaint wire shape. */
export type ComplaintStatus = "Open" | "In review" | "Awaiting meter reading";
export interface EvidenceValue { label: string; value: string; source: "Scenario assumption" | "Illustrative aggregate" | "Calculated value"; }
export interface MockPlan {
  id: string;
  title: string;
  items: { name: string; investment: string }[];
  summary: { label: string; value: string }[];
  assumptions: EvidenceValue[];
  evidence: EvidenceValue[];
}
