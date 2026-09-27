"use client";

import { useState, useSyncExternalStore } from "react";
import { Search, X } from "lucide-react";
import { PageHeader } from "@/components/pulse/shared";
import { AccountDetailSheet } from "./detail-sheets";
import { AccountRiskTable } from "./operations-tables";
import { mockAccounts, mockUsageHistory } from "@/data/mockAccounts";
import { clearReviewedAccounts, markAccountReviewed, readReviewedAccountIds, subscribeReviewedAccounts } from "@/lib/reviewed-accounts";
import type { PreventRiskAccount } from "@/types/pulse";

export function FlaggedBills() {
  const reviewedIds = useSyncExternalStore(subscribeReviewedAccounts, readReviewedAccountIds, () => []);
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("all");
  const [reviewState, setReviewState] = useState("active");
  const [sort, setSort] = useState("risk");
  const [selected, setSelected] = useState<PreventRiskAccount | null>(null);

  const rows = mockAccounts
    .filter((account) => !query.trim() || account.accountId.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((account) => risk === "all" || account.risk === risk)
    .filter((account) => reviewState === "all" || (reviewState === "reviewed" ? reviewedIds.includes(account.accountId) : !reviewedIds.includes(account.accountId)))
    .sort((left, right) => {
      if (sort === "variance") return right.deviationPercent - left.deviationPercent;
      if (sort === "estimates") return right.consecutiveEstimatedReads - left.consecutiveEstimatedReads;
      if (sort === "account") return left.accountId.localeCompare(right.accountId);
      return ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[left.risk] ?? 3) - ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[right.risk] ?? 3);
    });

  function handleReviewSaved(accountId: string) {
    markAccountReviewed(accountId);
    setSelected(null);
  }

  const active = query.trim() !== "" || risk !== "all" || reviewState !== "active" || sort !== "risk";
  function reset() { setQuery(""); setRisk("all"); setReviewState("active"); setSort("risk"); }
  function resetReviewState() { clearReviewedAccounts(); setReviewState("active"); }

  return <>
    <PageHeader title="Flagged bills" />
    <div className="toolbar flagged-toolbar">
      <label className="search-box"><Search size={16} /><span className="sr-only">Search flagged accounts</span><input placeholder="Search account ID..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="filters">
        <label className="sort-control"><span>Risk</span><select aria-label="Billing risk" value={risk} onChange={(event) => setRisk(event.target.value)}><option value="all">All</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></label>
        <label className="sort-control"><span>Review</span><select aria-label="Review state" value={reviewState} onChange={(event) => setReviewState(event.target.value)}><option value="active">Active</option><option value="reviewed">Reviewed</option><option value="all">All</option></select></label>
        <label className="sort-control"><span>Sort by</span><select aria-label="Sort flagged bills" value={sort} onChange={(event) => setSort(event.target.value)}><option value="risk">Highest risk</option><option value="variance">Largest variance</option><option value="estimates">Most estimated reads</option><option value="account">Account ID</option></select></label>
        {active && <button type="button" className="clear-filters" onClick={reset} aria-label="Clear flagged bill filters" title="Clear filters"><X size={13} aria-hidden="true" /><span className="clear-text">Clear</span></button>}
        {reviewedIds.length > 0 && <button type="button" className="clear-filters" onClick={resetReviewState}>Reset reviewed bills</button>}
      </div>
      <p className="table-count" role="status">{rows.length} flagged accounts</p>
    </div>
    <section className="table-section"><AccountRiskTable accounts={rows} reviewedAccountIds={reviewedIds} includeReviewStatus onSelect={setSelected} /></section>
    <AccountDetailSheet account={selected} history={selected ? mockUsageHistory[selected.accountId] ?? [] : []} onClose={() => setSelected(null)} onReviewSaved={handleReviewSaved} />
  </>;
}
