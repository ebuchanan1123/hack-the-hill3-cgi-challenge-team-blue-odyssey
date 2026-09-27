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
  status?: ComplaintStatus;
  dateOpened?: string;
  dateClosed?: string | null;
  resolutionAction?: string;
  billCorrectionValue?: number | null;
  channel?: string;
  sourceSystem?: string;
  transferredBetweenSystems?: number | boolean | null;
  slaBreach?: number | boolean | null;
  reopened?: number | boolean | null;
  accountId?: string;
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
  metrics: Metric[];
  statuses: Record<string, ComplaintStatus>;
  complaintTotal: number;
  complaintOffset: number;
  complaintLimit: number;
}

export interface Metric {
  label: string;
  value: string;
  trend: number[];
  change: string;
  improving: boolean;
}

/** Frontend-only status context; deliberately separate from Complaint wire shape. */
export type ComplaintStatus = "Open" | "In review" | "Awaiting meter reading" | "Closed" | "Closed - reopened";
export type WorkflowComplaintStatus = "Open" | "In progress" | "Resolved";
export type ResolutionType = "Bill corrected" | "Meter reading confirmed" | "Information provided" | "Escalated" | "Other";
export type AccountReviewAction = "Cleared for billing" | "Held for validation" | "Meter reading requested" | "Escalated for manual review";
export interface AskPulseEvidence {
  id: string;
  label: string;
  value: string;
  source: string;
  period?: string | null;
  evidenceType: "sourceFact" | "derivedMetric" | "scenarioAssumption";
}

export interface AskPulseResponse {
  question: string;
  answer: string;
  evidence: AskPulseEvidence[];
  caveats: string[];
  suggestedFollowUps: string[];
  grounding: "grounded" | "insufficientData";
}

export type StrategyInterventionId =
  | "targeted-validation"
  | "meterhub-improvement"
  | "targeted-smart-meter-deployment"
  | "transfer-integration-improvement";

export interface StrategyInterventionInput {
  id: StrategyInterventionId;
  investmentUsd: number;
  annualOperatingCostUsd: number;
  reductionPercent: {
    conservative: number;
    base: number;
    upside: number;
  };
}

export interface StrategySimulationRequest {
  budgetUsd: number;
  horizonMonths: number;
  objective: "maximizeNetSavings" | "maximizeRoi" | "minimizePayback";
  portfolioOverlapPercent: number;
  interventions: StrategyInterventionInput[];
}

export interface StrategyGenerationRequest {
  budgetUsd: number;
  horizonMonths: number;
  objective: StrategySimulationRequest["objective"];
  annualOperatingCostUsd: number;
  portfolioOverlapPercent: number;
  priorities: string;
}

export interface StrategyAllocation {
  id: StrategyInterventionId;
  name: string;
  allocationUsd: number;
  annualOperatingCostUsd: number;
  eligibleEventsPerYear: number;
  impactPercent: number;
  impactKind: "complaints" | "transfers";
  eventLabel: string;
  impactLabel: string;
  overlapDiscountPercent: number;
  estimatedEventsPerYear: number;
  estimatedTransfersReducedPerYear: number;
  standaloneAnnualGrossSavingsUsd: number;
  incrementalAnnualGrossSavingsUsd: number;
  source: string;
  calculation: string;
}

export interface StrategyConfidenceResult {
  confidence: "CONSERVATIVE" | "BASE" | "UPSIDE";
  objective: StrategySimulationRequest["objective"];
  allocations: StrategyAllocation[];
  budgetUsd: number;
  allocatedUsd: number;
  unallocatedBudgetUsd: number;
  estimatedComplaintsAvoidedPerYear: number;
  estimatedTransfersReducedPerYear: number;
  annualGrossSavingsUsd: number;
  annualOperatingCostUsd: number;
  annualNetSavingsUsd: number;
  horizonMonths: number;
  horizonNetBenefitUsd: number;
  roiPercent: number | null;
  paybackMonths: number | null;
  overlapAssumptionPercent: number;
  calculation: string[];
}

export interface StrategySimulationResponse {
  currency: "USD";
  objective: StrategySimulationRequest["objective"];
  objectiveExplanation: string;
  budgetUsd: number;
  horizonMonths: number;
  baselineObservedMonths: number | null;
  confidenceStrategies: StrategyConfidenceResult[];
  userInputs: StrategyInterventionInput[];
  assumptions: string[];
  dataLimitations: string[];
}

export interface AiStrategyRecommendation {
  id: StrategyInterventionId;
  name: string;
  description: string;
  rationale: string;
  suggestedAllocationPercent: number;
  suggestedAllocationUsd: number;
  selectedInBaseCase: boolean;
  eligibleEventsPerYear: number;
  eventLabel: string;
  savingsPerEventUsd: number;
  source: string;
  impactAssumptionsPercent: {
    conservative: number;
    base: number;
    upside: number;
  };
}

export interface StrategyGenerationResponse extends StrategySimulationResponse {
  planningInputs: StrategyGenerationRequest;
  aiStrategy: {
    title: string;
    summary: string;
    caveats: string[];
    recommendedInterventions: AiStrategyRecommendation[];
  };
  availableInterventionCount: number;
}
