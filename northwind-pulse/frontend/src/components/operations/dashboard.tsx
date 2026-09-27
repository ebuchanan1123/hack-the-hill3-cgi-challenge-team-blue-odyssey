"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Target } from "lucide-react";
import { PageHeader, MetricCard, InfoControl } from "@/components/pulse/shared";
import { AccountRiskTable, ComplaintTable } from "./operations-tables";
import { AccountDetailSheet, ComplaintDetailSheet } from "./detail-sheets";
import { markAccountReviewed, readReviewedAccountIds } from "@/lib/reviewed-accounts";
import type { OperationsData, Complaint, PreventRiskAccount } from "@/types/pulse";

/** One-line focus for the period, derived from the complaint queue. */
function periodFocus(openOverdueCount: number) {
  if (!openOverdueCount) return "All open complaints are within their resolution target.";
  return `${openOverdueCount} open complaints are past their resolution deadline.`;
}

export function Dashboard({ accounts, complaints, usageHistory, statuses, metrics, openOverdueCount }: OperationsData) {
  const [account, setAccount] = useState<PreventRiskAccount | null>(null); const [complaint, setComplaint] = useState<Complaint | null>(null); const [reviewedAccountIds, setReviewedAccountIds] = useState<string[]>(() => readReviewedAccountIds());
  const reviewAccounts = accounts.filter((item) => !reviewedAccountIds.includes(item.accountId)).slice(0, 7); const highRisk = reviewAccounts.filter(a => a.risk === "HIGH").length;
  function handleReviewSaved(accountId: string) { markAccountReviewed(accountId); setReviewedAccountIds((current) => current.includes(accountId) ? current : [...current, accountId]); setAccount(null); }
  const [learning, setLearning] = useState<{ complaintFeedbackCount: number; resolvedComplaintCount: number; accountReviewCount: number; rootCauses: string[]; message: string } | null>(null);
  useEffect(() => { fetch("/api/learning/summary").then((response) => response.ok ? response.json() : null).then((value) => setLearning(value)).catch(() => undefined); }, []);
  return <>
    <PageHeader title="Operations" hero>
      <div className="focus-strip"><span className="focus-label"><Target size={14} aria-hidden="true" />Focus this period</span><span>{periodFocus(openOverdueCount)}</span><Link href="/complaints">Review complaints<ArrowRight size={13} aria-hidden="true" /></Link></div>
    </PageHeader>
    <div className="metrics-grid">{metrics.map(metric => <MetricCard key={metric.label} {...metric} />)}</div>
    <section className="table-section surface-card">
      <header><div className="section-title"><h2>Flagged bills</h2><InfoControl label="About pre-bill review">Customer-level usage history is simulated for this prototype.</InfoControl></div><span className="section-meta"><Link href="/flagged-bills">View all flagged bills</Link> · {reviewAccounts.length} active · <strong>{highRisk} high risk</strong></span></header>
      <AccountRiskTable accounts={reviewAccounts} onSelect={setAccount} />
    </section>
    {learning && <section className="learning-strip" aria-labelledby="learning-title"><div><span className="result-eyebrow">LEARN</span><h2 id="learning-title">Feedback is becoming prevention data</h2><p>{learning.message}</p></div><div className="learning-stats"><strong>{learning.resolvedComplaintCount}</strong><span>complaints resolved with feedback</span><strong>{learning.accountReviewCount}</strong><span>pre-bill reviews recorded</span></div>{learning.rootCauses.length > 0 && <div className="learning-causes"><span>Root causes captured</span><b>{learning.rootCauses.join(" · ")}</b></div>}</section>}
    <section className="table-section surface-card">
      <header><div className="section-title"><h2>Recent complaints</h2></div><Link href="/complaints" className="section-link">View all complaints<ArrowRight size={13} aria-hidden="true" /></Link></header>
      <ComplaintTable compact complaints={complaints.slice(0, 4)} statuses={statuses} onSelect={setComplaint} />
    </section>
    <AccountDetailSheet account={account} history={account ? usageHistory[account.accountId] ?? [] : []} onClose={() => setAccount(null)} onReviewSaved={handleReviewSaved} />
    <ComplaintDetailSheet complaint={complaint} status={complaint ? statuses[complaint.id] : undefined} onClose={() => setComplaint(null)} />
  </>;
}
