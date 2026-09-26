"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Info, X, Inbox, ShieldAlert, ArrowLeftRight, Clock3, CircleAlert, CircleCheck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Deadline } from "@/lib/deadline";
const priorityLevels: Record<string, string> = { P1: "HIGH", P2: "MEDIUM", P3: "LOW" };
export const levelOrder = ["HIGH", "MEDIUM", "LOW"];
/** Maps contract priority codes (P1–P3) to the High/Medium/Low scale used everywhere in the UI. */
export function priorityLevel(priority: string) { return priorityLevels[priority] ?? priority; }
export function levelLabel(level: string) { return level.charAt(0) + level.slice(1).toLowerCase(); }
export function RiskBadge({ risk }: { risk: string }) { return <span className={`risk-badge ${risk.toLowerCase()}`}>{levelLabel(risk)}</span>; }
const deadlineIcons = { Overdue: CircleAlert, "Due soon": Clock3, "On track": CircleCheck };
export function DeadlineBadge({ deadline, text = deadline.label }: { deadline: Deadline; text?: string }) { const Icon = deadlineIcons[deadline.state]; return <span className={`deadline-badge deadline-${deadline.state.toLowerCase().replace(" ", "-")}`}><Icon size={12} aria-hidden="true" />{text}</span>; }
export function PriorityLabel({ priority }: { priority: string }) { const level = priorityLevel(priority); const bars = 3 - levelOrder.indexOf(level); return <span className={`priority priority-${level.toLowerCase()}`}><span className="priority-bars" aria-hidden="true">{[1, 2, 3].map(bar => <i key={bar} className={levelOrder.includes(level) && bar <= bars ? "on" : undefined} />)}</span>{levelLabel(level)}</span>; }
export function ExplainButton({ title = "Why?", children }: { title?: string; children: ReactNode }) { return <details className="explanation"><summary>{title}</summary><div>{children}</div></details>; }
export function InfoControl({ label = "About this data", title, children }: { label?: string; title?: string; children: ReactNode }) {
  return <details className="info-control"><summary aria-label={label} title={label}><Info size={16} /></summary><div className="info-popover">{title && <strong>{title}</strong>}<div className="info-body">{children}</div></div></details>;
}
export function PageHeader({ title }: { title: string }) {
  const context: Record<string, string> = { Dashboard: "Operational overview", Complaints: "Active cases and routing", "Decision Twin": "Investment scenarios" };
  return <header className="page-header"><div><h1>{title}</h1><p>{context[title]}</p></div></header>;
}
export function MetricCard({ label, value }: { label: string; value: string }) {
  const iconMap = { "Open complaints": { Icon: Inbox, tone: "blue" }, "High-risk bills": { Icon: ShieldAlert, tone: "red" }, "Transferred complaints": { Icon: ArrowLeftRight, tone: "amber" }, "Avg. time to resolve": { Icon: Clock3, tone: "teal" } };
  const { Icon, tone } = iconMap[label as keyof typeof iconMap] ?? iconMap["Open complaints"];
  return <div className={`metric-card metric-${tone}`}><div><span className="metric-icon"><Icon size={17} /></span></div><span className="metric-label">{label}</span><strong>{value}</strong></div>;
}
export function EvidenceDrawer({ open, onClose, title, eyebrow, children }: { open: boolean; onClose: () => void; title: string; eyebrow: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reduced = useReducedMotion();
  useEffect(() => { const element = dialog.current; if (!element || !open) return; const previous = document.activeElement as HTMLElement | null; element.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { element.close(); document.body.style.overflow = overflow; previous?.focus(); }; }, [open]);
  return <dialog ref={dialog} className="evidence-dialog" aria-labelledby={titleId} onCancel={onClose} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={event => { if (event.key !== "Tab") return; const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')).filter(el => el.getClientRects().length); const first = items[0]; const last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }}>
    {open && <motion.div initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .15 }}><header className="drawer-header"><div><span className="muted">{eyebrow}</span><h2 id={titleId}>{title}</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close details"><X size={19} /></Button></header><div className="drawer-body">{children}</div></motion.div>}
  </dialog>;
}
