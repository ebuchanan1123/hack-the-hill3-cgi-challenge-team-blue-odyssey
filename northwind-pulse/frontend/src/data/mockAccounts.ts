import type { PreventRiskAccount, UsagePoint } from "@/types/pulse";

export const mockAccounts: PreventRiskAccount[] = [
  { accountId: "ACC-18492", expectedUsage: 820, estimatedUsage: 1270, deviationPercent: 55, consecutiveEstimatedReads: 3, previousCorrection: true, risk: "HIGH", recommendedAction: "Validate before billing", reasons: ["Usage is well above the typical seasonal range", "Three consecutive estimated reads", "Previous bill correction"] },
  { accountId: "ACC-20831", expectedUsage: 640, estimatedUsage: 1010, deviationPercent: 58, consecutiveEstimatedReads: 4, previousCorrection: true, risk: "HIGH", recommendedAction: "Request a meter reading", reasons: ["Estimate is 58% above typical usage", "Four consecutive estimated reads", "Previous bill correction warrants a closer review"] },
  { accountId: "ACC-15706", expectedUsage: 950, estimatedUsage: 1390, deviationPercent: 46, consecutiveEstimatedReads: 3, previousCorrection: false, risk: "HIGH", recommendedAction: "Validate before billing", reasons: ["Estimate is well above typical usage", "Three consecutive estimated reads without a recorded reading"] },
  { accountId: "ACC-31284", expectedUsage: 710, estimatedUsage: 930, deviationPercent: 31, consecutiveEstimatedReads: 2, previousCorrection: false, risk: "MEDIUM", recommendedAction: "Review usage estimate", reasons: ["Estimate is 31% above typical usage", "Two consecutive estimated reads"] },
  { accountId: "ACC-22619", expectedUsage: 580, estimatedUsage: 730, deviationPercent: 26, consecutiveEstimatedReads: 2, previousCorrection: true, risk: "MEDIUM", recommendedAction: "Review previous correction", reasons: ["A previous correction is recorded", "Two consecutive estimates may warrant manual review"] },
  { accountId: "ACC-40952", expectedUsage: 880, estimatedUsage: 1050, deviationPercent: 19, consecutiveEstimatedReads: 1, previousCorrection: false, risk: "MEDIUM", recommendedAction: "Review usage estimate", reasons: ["Estimate is 19% above typical usage", "Review seasonal context before billing"] },
  { accountId: "ACC-17305", expectedUsage: 760, estimatedUsage: 800, deviationPercent: 5, consecutiveEstimatedReads: 1, previousCorrection: false, risk: "LOW", recommendedAction: "Continue routine monitoring", reasons: ["Estimate is close to typical usage", "No previous bill corrections"] },
];

// Illustrative histories only. Not part of the frozen account API contract.
const recorded: Record<string, number[]> = {
  "ACC-18492": [780, 740, 690, 720, 790],
  "ACC-20831": [620, 570, 530, 560, 610],
  "ACC-15706": [900, 830, 780, 850, 920],
  "ACC-31284": [670, 620, 580, 630, 680],
  "ACC-22619": [550, 510, 460, 520, 560],
  "ACC-40952": [850, 780, 720, 790, 860],
  "ACC-17305": [740, 680, 620, 690, 730],
};
const expected: Record<string, number[]> = {
  "ACC-18492": [800, 750, 700, 730, 780],
  "ACC-20831": [630, 590, 550, 580, 620],
  "ACC-15706": [930, 860, 800, 860, 930],
  "ACC-31284": [690, 640, 600, 650, 690],
  "ACC-22619": [570, 530, 490, 530, 570],
  "ACC-40952": [870, 800, 750, 810, 870],
  "ACC-17305": [750, 690, 650, 710, 740],
};
export const mockUsageHistory: Record<string, UsagePoint[]> = Object.fromEntries(
  mockAccounts.map((account) => [account.accountId, [
    ...["Apr", "May", "Jun", "Jul", "Aug"].map((month, index) => ({ month, expected: expected[account.accountId][index], recorded: recorded[account.accountId][index] })),
    { month: "Sep", expected: account.expectedUsage, estimate: account.estimatedUsage },
  ]]),
);
