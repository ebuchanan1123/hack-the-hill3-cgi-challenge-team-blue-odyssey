import { mockAccounts, mockUsageHistory } from "./mockAccounts";
import { mockComplaints } from "./mockComplaints";
import type { OperationsData } from "@/types/pulse";

/** Replace this data boundary with API calls later; keep presentation props intact. */
export async function getOperationsData(): Promise<OperationsData> {
  return { accounts: mockAccounts, complaints: mockComplaints, usageHistory: mockUsageHistory };
}
