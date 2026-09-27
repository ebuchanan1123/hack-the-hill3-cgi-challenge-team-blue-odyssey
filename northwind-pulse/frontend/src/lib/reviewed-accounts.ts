const REVIEWED_ACCOUNTS_KEY = "northwind-pulse.reviewed-accounts";

export function readReviewedAccountIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(REVIEWED_ACCOUNTS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function markAccountReviewed(accountId: string) {
  const reviewed = new Set(readReviewedAccountIds());
  reviewed.add(accountId);
  window.localStorage.setItem(REVIEWED_ACCOUNTS_KEY, JSON.stringify([...reviewed]));
}
