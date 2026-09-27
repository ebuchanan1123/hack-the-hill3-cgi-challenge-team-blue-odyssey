"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Sparkles, CalendarRange, FileText, Scale, ListChecks, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EvidenceDrawer, PageHeader, InfoControl } from "@/components/pulse/shared";
import { PageActions } from "@/components/pulse/page-actions";
import type { MockPlan } from "@/types/pulse";
import { getMockResponse } from "@/data/mockPlanning";
/** "$900K" → 900000, "$1.1M" → 1100000. */
function parseAmount(value: string) { const match = value.match(/([\d.]+)\s*([KM])?/i); if (!match) return 0; return Number(match[1]) * (match[2]?.toUpperCase() === "M" ? 1e6 : match[2] ? 1e3 : 1); }
export function DecisionTwin({ plans, suggestions }: { plans: MockPlan[]; suggestions: string[] }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState({ plan: plans[0] });
  const [drawer, setDrawer] = useState<"assumptions" | "evidence" | "compare" | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reduced = useReducedMotion();
  useEffect(() => () => clearTimeout(timer.current), []);
  /** Brief evaluation step before the result updates; ignores repeat requests while one is running. */
  function ask(text: string) {
    if (pending || !text.trim()) return;
    setPending(text);
    timer.current = setTimeout(() => { setResult(getMockResponse(text)); setRun(value => value + 1); setPending(null); }, 800);
  }
  function submit(e: FormEvent) { e.preventDefault(); ask(question); }
  const { plan } = result;
  const total = plan.items.reduce((sum, item) => sum + parseAmount(item.investment), 0) || 1;
  const [headline, ...outcomes] = plan.summary;
  const exportRows = () => [["Plan", plan.title], [], ["Investment item", "Amount"], ...plan.items.map(item => [item.name, item.investment]), [], ["Outcome", "Value"], ...plan.summary.map(item => [item.label, item.value]), [], ["Assumption", "Value"], ...plan.assumptions.map(item => [item.label, item.value])];
  return <><PageHeader title="Decision Twin" actions={<PageActions exportName="northwind-investment-plan" getRows={exportRows} />} /><div className="decision-content">
    <section className="ask-panel"><form className="ask-form" onSubmit={submit}><div className="ask-heading"><span className="ask-mark"><Sparkles size={15} aria-hidden="true" /></span><label htmlFor="question">Ask Pulse</label><InfoControl label="Privacy" title="Privacy">Pulse uses aggregated scenario outputs only. Raw customer data is never sent to the AI.</InfoControl></div><div className="ask-input"><textarea id="question" rows={2} value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} maxLength={1000} placeholder="Where should Northwind invest $3M to reduce complaints over 12 months?" /><Button type="submit" size="icon" disabled={!question.trim() || !!pending} aria-label="Ask Pulse">{pending ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <ArrowUp size={18} />}</Button></div></form><div className="suggestions">{suggestions.map(text => <button key={text} type="button" disabled={!!pending} className={pending === text ? "is-pending" : undefined} onClick={() => { setQuestion(text); ask(text); }}>{text}</button>)}<span className="ask-status" role="status">{pending && <><span className="ask-dots" aria-hidden="true"><i /><i /><i /></span>Analyzing scenario…</>}</span></div></section>
    <section className={`plan-result${pending ? " is-pending" : ""}`} aria-live="polite" aria-busy={!!pending}><motion.div key={run} initial={reduced || run === 0 ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2, ease: "easeOut" }}>
      <header className="plan-header"><div className="plan-heading"><span className="result-eyebrow">Recommended plan</span><h2>{plan.title}</h2><p className="plan-rationale">{plan.rationale}</p></div><div className="result-meta"><span className="meta-pill"><CalendarRange size={13} aria-hidden="true" /><span>12 months</span></span><div className="plan-total"><strong>{headline.value}</strong><span>total</span></div></div></header>
      <div className="plan-block"><h3>Allocation</h3><div className="plan-grid allocation-bar" aria-hidden="true">{plan.items.map((item, index) => <span key={item.name} className={`alloc-${index % 3}`}><i style={{ width: `${(parseAmount(item.investment) / total) * 100}%` }} /></span>)}</div>
        <ol className="plan-grid plan-items">{plan.items.map((item, index) => <li key={item.name} className={`alloc-${index % 3}`}><span className="plan-item-label">{item.name}</span><strong>{item.investment}</strong><span className="plan-item-share">{Math.round((parseAmount(item.investment) / total) * 100)}%<span className="sr-only"> of budget</span></span></li>)}</ol>
      </div>
      <div className="plan-block"><h3>Expected outcomes</h3><dl className="plan-grid plan-summary">{outcomes.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></div>
      <div className="result-actions"><Button variant="outline" onClick={() => setDrawer("assumptions")}><ListChecks size={15} aria-hidden="true" />View assumptions</Button><Button variant="outline" onClick={() => setDrawer("evidence")}><FileText size={15} aria-hidden="true" />View evidence</Button><Button variant="outline" onClick={() => setDrawer("compare")}><Scale size={15} aria-hidden="true" />Compare</Button></div>
    </motion.div></section>
    <EvidenceDrawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer === "assumptions" ? "Assumptions" : drawer === "evidence" ? "Evidence" : "Compare scenarios"} eyebrow="Investment planning">
      <div className="drawer-utility"><span className="muted">{plan.title}</span></div>
      {drawer === "compare" ? <div className="table-scroll comparison-table"><table><thead><tr><th>Metric</th>{plans.map(p => <th key={p.id}>{p.title}</th>)}</tr></thead><tbody>{plans[0].summary.map((metric, index) => <tr key={metric.label}><th>{metric.label}</th>{plans.map(p => <td key={p.id}>{p.summary[index].value}</td>)}</tr>)}</tbody></table></div> : <dl className="evidence-values">{(drawer === "assumptions" ? plan.assumptions : plan.evidence).map(item => <div key={item.label}><dt>{item.label}<span className="source-line">Source: <span className={`source-tag source-${item.source.split(" ")[0].toLowerCase()}`}>{item.source}</span></span></dt><dd>{item.value}</dd></div>)}</dl>}
    </EvidenceDrawer>
  </div></>;
}
