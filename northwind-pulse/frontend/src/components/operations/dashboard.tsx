"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Target } from "lucide-react";
import { PageHeader, MetricCard, InfoControl, priorityLevel, levelLabel } from "@/components/pulse/shared";
import { PageActions } from "@/components/pulse/page-actions";
import { AccountRiskTable, ComplaintTable } from "./operations-tables";
import { AccountDetailSheet, ComplaintDetailSheet } from "./detail-sheets";
import { getDeadline } from "@/lib/deadline";
import { markAccountReviewed, readReviewedAccountIds } from "@/lib/reviewed-accounts";
import type { OperationsData, Complaint, PreventRiskAccount } from "@/types/pulse";

/** One-line focus for the period, derived from the complaint queue. */
function periodFocus(complaints: Complaint[]) {
  const overdue = complaints.filter(c => getDeadline(c)?.state === "Overdue");
  if (!overdue.length) return "All open complaints are within their resolution target.";
  const byRegion = overdue.reduce<Record<string, number>>((counts, c) => ({ ...counts, [c.region]: (counts[c.region] ?? 0) + 1 }), {});
  const [region, count] = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];
  return `${overdue.length} of ${complaints.length} complaints are past their resolution deadline${count > 1 ? `, most in ${region}` : ""}.`;
}

export function Dashboard({ accounts, complaints, usageHistory, statuses, metrics }: OperationsData) {
  const [account, setAccount] = useState<PreventRiskAccount | null>(null); const [complaint, setComplaint] = useState<Complaint | null>(null); const [reviewedAccountIds, setReviewedAccountIds] = useState<string[]>(() => readReviewedAccountIds());
  const reviewAccounts = accounts.filter((item) => !reviewedAccountIds.includes(item.accountId)).slice(0, 7); const highRisk = reviewAccounts.filter(a => a.risk === "HIGH").length;
  function handleReviewSaved(accountId: string) { markAccountReviewed(accountId); setReviewedAccountIds((current) => current.includes(accountId) ? current : [...current, accountId]); setAccount(null); }
  const exportRows = () => [
    ["Metric", "Value"], ...metrics.map(m => [m.label, m.value]), [],
    ["Account", "Typical usage (kWh)", "Estimated usage (kWh)", "Above typical (%)", "Billing risk", "Recommended action"], ...reviewAccounts.map(a => [a.accountId, a.expectedUsage, a.estimatedUsage, a.deviationPercent, levelLabel(a.risk), a.recommendedAction]), [],
    ["Complaint", "Category", "Region", "Priority", "Days open", "Deadline"], ...complaints.map(c => [c.id, c.category, c.region, levelLabel(priorityLevel(c.priority)), c.daysOpen, getDeadline(c)?.label ?? ""]),
  ];
  return <>
    <PageHeader title="Operations" hero actions={<PageActions period="Last 30 days" exportName="northwind-dashboard" getRows={exportRows} />}>
      <div className="focus-strip"><span className="focus-label"><Target size={14} aria-hidden="true" />Focus this period</span><span>{periodFocus(complaints)}</span><Link href="/complaints">Review complaints<ArrowRight size={13} aria-hidden="true" /></Link></div>
    </PageHeader>
    <div className="metrics-grid">{metrics.map(metric => <MetricCard key={metric.label} {...metric} />)}</div>
    <section className="table-section surface-card">
      <header><div className="section-title"><h2>Flagged bills</h2><InfoControl label="About pre-bill review">Customer-level usage history is simulated for this prototype.</InfoControl></div><span className="section-meta"><Link href="/flagged-bills">View all flagged bills</Link> · {reviewAccounts.length} active · <strong>{highRisk} high risk</strong></span></header>
      <AccountRiskTable accounts={reviewAccounts} onSelect={setAccount} />
    </section>
    <section className="table-section surface-card">
      <header><div className="section-title"><h2>Recent complaints</h2></div><Link href="/complaints" className="section-link">View all complaints<ArrowRight size={13} aria-hidden="true" /></Link></header>
      <ComplaintTable compact complaints={complaints.slice(0, 4)} statuses={statuses} onSelect={setComplaint} />
    </section>
    <AccountDetailSheet account={account} history={account ? usageHistory[account.accountId] ?? [] : []} onClose={() => setAccount(null)} onReviewSaved={handleReviewSaved} />
    <ComplaintDetailSheet complaint={complaint} status={complaint ? statuses[complaint.id] : undefined} onClose={() => setComplaint(null)} />
  </>;
}
