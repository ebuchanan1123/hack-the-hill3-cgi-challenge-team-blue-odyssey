"use client";
import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from "react";
import { Info, X, Inbox, ShieldAlert, ArrowLeftRight, Clock3, CircleAlert, CircleCheck, TrendingDown, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Deadline } from "@/lib/deadline";
import type { Metric } from "@/types/pulse";
const priorityLevels: Record<string, string> = { P1: "HIGH", P2: "MEDIUM", P3: "LOW" };
export const levelOrder = ["HIGH", "MEDIUM", "LOW"];
/** Maps contract priority codes (P1–P3) to the High/Medium/Low scale used everywhere in the UI. */
export function priorityLevel(priority: string) { return priorityLevels[priority] ?? priority; }
export function levelLabel(level: string) { return level.charAt(0) + level.slice(1).toLowerCase(); }
export function RiskBadge({ risk }: { risk: string }) { return <span className={`risk-badge ${risk.toLowerCase()}`}>{levelLabel(risk)}</span>; }
const deadlineIcons = { Overdue: CircleAlert, "Due soon": Clock3, "On track": CircleCheck };
export function DeadlineBadge({ deadline, text = deadline.label }: { deadline: Deadline; text?: string }) { const Icon = deadlineIcons[deadline.state]; return <span className={`deadline-badge deadline-${deadline.state.toLowerCase().replace(" ", "-")}`}><Icon size={12} aria-hidden="true" />{text}</span>; }
export function PriorityLabel({ priority }: { priority: string }) { const level = priorityLevel(priority); const bars = 3 - levelOrder.indexOf(level); return <span className={`priority priority-${level.toLowerCase()}`}><span className="priority-bars" aria-hidden="true">{[1, 2, 3].map(bar => <i key={bar} className={levelOrder.includes(level) && bar <= bars ? "on" : undefined} />)}</span>{levelLabel(level)}</span>; }
function closeOtherInfoControls(event: SyntheticEvent<HTMLDetailsElement>) {
  const current = event.currentTarget;
  if (!current.open) return;
  document.querySelectorAll<HTMLDetailsElement>("details.info-control[open]").forEach((control) => {
    if (control !== current) control.open = false;
  });
}
export function InfoControl({ label = "About this data", title, children }: { label?: string; title?: string; children: ReactNode }) {
  return <details className="info-control" onToggle={closeOtherInfoControls}><summary aria-label={label} title={label}><Info size={16} /></summary><div className="info-popover">{title && <strong>{title}</strong>}<div className="info-body">{children}</div></div></details>;
}
const pageContext: Record<string, string> = {
  Operations: "Billing risk and complaint operations",
  Complaints: "Active cases and routing",
  "Flagged bills": "Review risky bills before they become complaints",
  "Decision Twin": "Choose where Northwind should invest next",
};
export function PageHeader({ title, hero = false, actions, children }: { title: string; hero?: boolean; actions?: ReactNode; children?: ReactNode }) {
  return <header className={hero ? "page-header page-hero" : "page-header"}>
    {hero && <HeroMotif />}
    <div className="page-header-row"><div className="page-title"><h1>{title}</h1>{pageContext[title] && <p>{pageContext[title]}</p>}</div>{actions}</div>
    {children}
  </header>;
}
/** Decorative data motif for the Dashboard header. */
function HeroMotif() {
  const bars = [26, 36, 30, 44, 40, 52, 47, 60, 56, 68];
  return <svg className="hero-motif" viewBox="0 0 420 180" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
    <defs><linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b73b9" stopOpacity=".16" /><stop offset="1" stopColor="#3b73b9" stopOpacity="0" /></linearGradient></defs>
    {[40, 80, 120, 160].map(y => <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="#3b73b9" strokeOpacity=".07" />)}
    {bars.map((height, index) => <rect key={index} x={30 + index * 38} y={170 - height} width="16" height={height} rx="3" fill="#3b73b9" fillOpacity={0.05 + index * 0.009} />)}
    <path d="M10 152 C 60 144, 90 148, 130 134 S 210 122, 250 112 S 330 98, 410 78 L 410 180 L 10 180 Z" fill="url(#hero-area)" />
    <path d="M10 152 C 60 144, 90 148, 130 134 S 210 122, 250 112 S 330 98, 410 78" fill="none" stroke="#3b73b9" strokeOpacity=".35" strokeWidth="1.6" />
    
  </svg>;
}
const metricStyles = { "Open complaints": { Icon: Inbox, tone: "blue" }, "High-risk bills": { Icon: ShieldAlert, tone: "red" }, "Transferred complaints": { Icon: ArrowLeftRight, tone: "amber" }, "Avg. time to resolve": { Icon: Clock3, tone: "teal" } };
function Sparkline({ values }: { values: number[] }) {
  const id = useId(); const min = Math.min(...values); const range = Math.max(...values) - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${28 - ((value - min) / range) * 24}`);
  return <svg className="sparkline" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".18" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs><path d={`M${points.join(" L")} L100,32 L0,32 Z`} fill={`url(#${id})`} /><polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
export function MetricCard({ label, value, trend, change, improving }: Metric) {
  const { Icon, tone } = metricStyles[label as keyof typeof metricStyles] ?? metricStyles["Open complaints"];
  const rising = trend[trend.length - 1] > trend[0]; const TrendIcon = rising ? TrendingUp : TrendingDown;
  return <div className={`metric-card metric-${tone}`}>
    <div className="metric-top"><span className="metric-icon"><Icon size={16} /></span><span className="metric-label">{label}</span></div>
    <div className="metric-body"><strong>{value}</strong><Sparkline values={trend} /></div>
    <span className={`metric-change ${improving ? "is-better" : "is-worse"}`}><TrendIcon size={13} aria-hidden="true" />{change}<span className="sr-only">{improving ? " (improving)" : " (worsening)"}</span></span>
  </div>;
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
