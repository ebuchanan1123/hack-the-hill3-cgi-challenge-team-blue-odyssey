"use client";
import { DeadlineBadge, EvidenceDrawer, InfoControl, PriorityLabel, RiskBadge } from "@/components/pulse/shared";
import { getDeadline } from "@/lib/deadline";
import { UsageChart } from "./usage-chart";
import type { Complaint, ComplaintStatus, PreventRiskAccount, UsagePoint } from "@/types/pulse";
const n = new Intl.NumberFormat("en-CA");
export function AccountDetailSheet({ account, history, onClose }: { account: PreventRiskAccount | null; history: UsagePoint[]; onClose: () => void }) {
  return <EvidenceDrawer open={!!account} onClose={onClose} title={account?.accountId ?? "Account"} eyebrow="Account review"><>{account && <><div className="drawer-utility"><span className="muted">Billing risk</span><RiskBadge risk={account.risk} /></div><UsageChart history={history} /><dl className="facts three"><div><dt>Typical usage</dt><dd>{n.format(account.expectedUsage)} kWh</dd></div><div><dt>Estimated usage</dt><dd>{n.format(account.estimatedUsage)} kWh</dd></div><div><dt>Above typical</dt><dd>+{account.deviationPercent}%</dd></div></dl><section className="drawer-section"><h3>Why flagged</h3><ul>{account.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></section><section className="recommendation"><h3>Recommended action</h3><p>{account.recommendedAction}</p></section></>}</></EvidenceDrawer>;
}
export function ComplaintDetailSheet({ complaint, status, onClose }: { complaint: Complaint | null; status?: ComplaintStatus; onClose: () => void }) {
  const deadline = complaint ? getDeadline(complaint) : null;
  return <EvidenceDrawer open={!!complaint} onClose={onClose} title={complaint?.id ?? "Complaint"} eyebrow="Case details">{complaint && <>
    <section className="drawer-section overview"><div className="drawer-utility"><h3>Overview</h3></div><dl className="facts"><div><dt>Category</dt><dd>{complaint.category}</dd></div><div><dt>Region</dt><dd>{complaint.region}</dd></div><div><dt>Priority</dt><dd><PriorityLabel priority={complaint.priority} /></dd></div><div><dt>Days open</dt><dd>{complaint.daysOpen}</dd></div><div><dt>Status</dt><dd><span className="status">{status ?? "Not supplied"}</span></dd></div></dl></section>
    <section className="drawer-section"><h3>Deadline &amp; transfer</h3><dl className="facts two"><div><dt className="deadline-term">Resolution deadline<InfoControl label="About resolution deadlines">Northwind sets a resolution target based on complaint priority.<br />High: 5 days · Medium: 10 days · Low: 20 days</InfoControl></dt><dd>{deadline ? <span className="deadline-detail"><strong>{deadline.label}</strong><DeadlineBadge deadline={deadline} text={deadline.state} /></span> : "No target set"}</dd></div><div><dt>Transfer likelihood</dt><dd><RiskBadge risk={complaint.transferRisk} /></dd></div></dl></section>
    <section className="drawer-section routing"><h3>Routing</h3><dl className="facts"><div><dt>Recommended queue</dt><dd>{complaint.recommendedQueue}</dd></div><div><dt>Next action</dt><dd>{complaint.nextAction}</dd></div></dl></section>
    <section className="drawer-section"><h3>Why</h3><ul>{deadline && <li>{deadline.sentence}</li>}{complaint.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></section>
  </>}</EvidenceDrawer>;
}
