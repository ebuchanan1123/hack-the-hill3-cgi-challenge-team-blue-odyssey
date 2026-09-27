const REVIEWED_ACCOUNTS_KEY = "northwind-pulse.reviewed-accounts";
const REVIEW_OUTCOMES_KEY = "northwind-pulse.review-outcomes";
const REVIEW_UPDATED_EVENT = "northwind-pulse.review-updated";
let cachedReviewedIds: string[] | null = null;

export interface ReviewOutcome {
  action: "Cleared for billing" | "Held for validation" | "Meter reading requested" | "Escalated for manual review";
  correctedUsageKwh?: number;
  notes?: string;
}

export function readReviewedAccountIds(): string[] {
  if (typeof window === "undefined") return [];
  if (cachedReviewedIds) return cachedReviewedIds;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(REVIEWED_ACCOUNTS_KEY) ?? "[]");
    cachedReviewedIds = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return cachedReviewedIds;
  } catch {
    cachedReviewedIds = [];
    return [];
  }
}

export function markAccountReviewed(accountId: string) {
  const reviewed = new Set(readReviewedAccountIds());
  reviewed.add(accountId);
  cachedReviewedIds = [...reviewed];
  window.localStorage.setItem(REVIEWED_ACCOUNTS_KEY, JSON.stringify(cachedReviewedIds));
  window.dispatchEvent(new Event(REVIEW_UPDATED_EVENT));
}

export function subscribeReviewedAccounts(callback: () => void) {
  window.addEventListener(REVIEW_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(REVIEW_UPDATED_EVENT, callback); window.removeEventListener("storage", callback); };
}

export function readReviewOutcome(accountId: string): ReviewOutcome | null {
  if (typeof window === "undefined") return null;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(REVIEW_OUTCOMES_KEY) ?? "{}");
    if (!value || typeof value !== "object") return null;
    const outcome = (value as Record<string, unknown>)[accountId];
    return outcome && typeof outcome === "object" ? outcome as ReviewOutcome : null;
  } catch { return null; }
}

export function saveReviewOutcome(accountId: string, outcome: ReviewOutcome) {
  if (typeof window === "undefined") return;
  let outcomes: Record<string, ReviewOutcome> = {};
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(REVIEW_OUTCOMES_KEY) ?? "{}");
    if (value && typeof value === "object") outcomes = value as Record<string, ReviewOutcome>;
  } catch { /* Reset malformed demo storage. */ }
  outcomes[accountId] = outcome;
  window.localStorage.setItem(REVIEW_OUTCOMES_KEY, JSON.stringify(outcomes));
}

export function clearReviewedAccounts() {
  if (typeof window === "undefined") return;
  cachedReviewedIds = [];
  window.localStorage.removeItem(REVIEWED_ACCOUNTS_KEY);
  window.localStorage.removeItem(REVIEW_OUTCOMES_KEY);
  window.dispatchEvent(new Event(REVIEW_UPDATED_EVENT));
}
