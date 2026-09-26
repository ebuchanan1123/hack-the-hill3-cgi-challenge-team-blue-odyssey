"use client";
import { useState, type FormEvent } from "react";
import { ArrowUp, SlidersHorizontal, Waypoints, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EvidenceDrawer, PageHeader, InfoControl } from "@/components/pulse/shared";
import type { MockPlan } from "@/types/pulse";
import { getMockResponse } from "@/data/mockPlanning";
const planIcons = [SlidersHorizontal, Waypoints, Gauge];
export function DecisionTwin({ plans, suggestions }: { plans: MockPlan[]; suggestions: string[] }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState({ plan: plans[0] });
  const [drawer, setDrawer] = useState<"assumptions" | "evidence" | "compare" | null>(null);
  function submit(e: FormEvent) { e.preventDefault(); if (question.trim()) setResult(getMockResponse(question)); }
  return <><PageHeader title="Decision Twin" /><div className="decision-content">
    <section className="ask-panel"><form className="ask-form" onSubmit={submit}><div className="ask-heading"><label htmlFor="question">Ask Pulse</label><InfoControl label="Privacy" title="Privacy">Pulse uses aggregated scenario outputs only. Raw customer data is never sent to the AI.</InfoControl></div><div className="ask-input"><textarea id="question" rows={2} value={question} onChange={e => setQuestion(e.target.value)} maxLength={1000} placeholder="Where should Northwind invest $3M to reduce complaints over 12 months?" /><Button type="submit" size="icon" disabled={!question.trim()} aria-label="Ask Pulse"><ArrowUp size={18} /></Button></div></form><div className="suggestions">{suggestions.map(text => <button key={text} onClick={() => { setQuestion(text); setResult(getMockResponse(text)); }}>{text}</button>)}</div></section>
    <section className="plan-result" aria-live="polite"><header><div><span className="result-eyebrow">Recommended plan</span><h2>{result.plan.title}</h2></div><div className="result-meta"><span>12 months</span></div></header>
      <ol className="plan-items">{result.plan.items.map((item, index) => { const Icon = planIcons[index % planIcons.length]; return <li key={item.name}><span className="plan-item-icon"><Icon size={18} /></span><span className="plan-item-label">{item.name}</span><strong>{item.investment}</strong></li>; })}</ol>
      <div className="plan-summary">{result.plan.summary.map(item => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div><div className="result-actions"><Button variant="outline" onClick={() => setDrawer("assumptions")}>View assumptions</Button><Button variant="outline" onClick={() => setDrawer("evidence")}>View evidence</Button><Button variant="outline" onClick={() => setDrawer("compare")}>Compare</Button></div>
    </section>
    <EvidenceDrawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer === "assumptions" ? "Assumptions" : drawer === "evidence" ? "Evidence" : "Compare scenarios"} eyebrow="Investment planning">
      <div className="drawer-utility"><span className="muted">{result.plan.title}</span></div>
      {drawer === "compare" ? <div className="table-scroll comparison-table"><table><thead><tr><th>Metric</th>{plans.map(plan => <th key={plan.id}>{plan.title}</th>)}</tr></thead><tbody>{plans[0].summary.map((metric, index) => <tr key={metric.label}><th>{metric.label}</th>{plans.map(plan => <td key={plan.id}>{plan.summary[index].value}</td>)}</tr>)}</tbody></table></div> : <dl className="evidence-values">{(drawer === "assumptions" ? result.plan.assumptions : result.plan.evidence).map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>}
    </EvidenceDrawer>
  </div></>;
}
