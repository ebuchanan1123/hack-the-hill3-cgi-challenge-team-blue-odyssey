"use client";
import Link from "next/link";
import { useState } from "react";
import { PageHeader, MetricCard, InfoControl } from "@/components/pulse/shared";
import { AccountRiskTable, ComplaintTable } from "./operations-tables";
import { AccountDetailSheet, ComplaintDetailSheet } from "./detail-sheets";
import type { OperationsData, Complaint, ComplaintStatus, PreventRiskAccount } from "@/types/pulse";
export function Dashboard({ accounts, complaints, usageHistory, statuses, metrics }: OperationsData & { statuses: Record<string, ComplaintStatus>; metrics: { label: string; value: string }[] }) {
  const [account, setAccount] = useState<PreventRiskAccount | null>(null); const [complaint, setComplaint] = useState<Complaint | null>(null);
  return <><PageHeader title="Dashboard" /><div className="metrics-grid">{metrics.map(metric => <MetricCard key={metric.label} {...metric} />)}</div><section className="table-section"><header><h2>Pre-bill review</h2><InfoControl label="About pre-bill review">Demo account data used for this prototype.</InfoControl></header><AccountRiskTable accounts={accounts.slice(0, 7)} onSelect={setAccount} /></section><section className="table-section"><header><h2>Recent complaints</h2><Link href="/complaints">View all complaints →</Link></header><ComplaintTable compact complaints={complaints.slice(0, 4)} statuses={statuses} onSelect={setComplaint} /></section><AccountDetailSheet account={account} history={account ? usageHistory[account.accountId] ?? [] : []} onClose={() => setAccount(null)} /><ComplaintDetailSheet complaint={complaint} status={complaint ? statuses[complaint.id] : undefined} onClose={() => setComplaint(null)} /></>;
}
