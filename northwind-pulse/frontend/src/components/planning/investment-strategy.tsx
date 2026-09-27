"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EvidenceDrawer, InfoControl } from "@/components/pulse/shared";
import type { StrategyConfidenceResult, StrategyGenerationRequest, StrategyGenerationResponse } from "@/types/pulse";

type ConfidenceLevel = StrategyConfidenceResult["confidence"];
type DrawerKind = "assumptions" | "evidence" | "compare" | null;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

const strategyPresets = [
  { id: "pilot", label: "$100K pilot", budget: "100000", priorities: "Start with a measurable pilot focused on estimated-read complaints and quick operational savings." },
  { id: "rollout", label: "$1M rollout", budget: "1000000", priorities: "Fund broader rollout coverage across billing reliability, transfer reduction, and low smart-meter regions." },
  { id: "billing", label: "Fix billing estimates", budget: "250000", priorities: "Prioritize modernizing estimation logic and validating high-risk estimated bills before billing." },
  { id: "transfers", label: "Reduce transfers", budget: "250000", priorities: "Prioritize keeping complaint ownership inside Pulse and reducing avoidable system handoffs." },
];

function formatMoney(value: number, compact = false) {
  return (compact ? compactMoney : money).format(value);
}

function displayPayback(months: number | null) {
  if (months === null) return "Not positive";
  if (months > 120) return ">10 years";
  return `${percent.format(months)} mo`;
}

function getErrorMessage(body: unknown) {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return "Check the planning brief and try again.";
  }
  return "The investment strategy could not be generated. Please try again.";
}

export function InvestmentStrategy() {
  const [budgetUsd, setBudgetUsd] = useState("1000000");
  const [horizonMonths, setHorizonMonths] = useState("36");
  const [objective, setObjective] = useState<StrategyGenerationRequest["objective"]>("maximizeNetSavings");
  const [annualOperatingCostUsd, setAnnualOperatingCostUsd] = useState("0");
  const [portfolioOverlapPercent, setPortfolioOverlapPercent] = useState("25");
  const [priorities, setPriorities] = useState("");
  const [result, setResult] = useState<StrategyGenerationResponse | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceLevel>("BASE");
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const numericBudget = Number(budgetUsd);
  const numericHorizon = Number(horizonMonths);
  const numericOperatingCost = Number(annualOperatingCostUsd);
  const numericOverlap = Number(portfolioOverlapPercent);
  const fieldErrors = {
    budget: budgetUsd === "" || !Number.isFinite(numericBudget) || numericBudget < 1000 ? "Enter at least $1,000." : "",
    horizon: horizonMonths === "" || !Number.isFinite(numericHorizon) || numericHorizon < 1 || numericHorizon > 120 ? "Enter a horizon from 1 to 120 months." : "",
    operatingCost: annualOperatingCostUsd === "" || !Number.isFinite(numericOperatingCost) || numericOperatingCost < 0 ? "Enter $0 or more." : "",
    overlap: portfolioOverlapPercent === "" || !Number.isFinite(numericOverlap) || numericOverlap < 0 || numericOverlap > 100 ? "Enter a percentage from 0 to 100." : "",
  };
  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);
  const selected = result?.confidenceStrategies.find((item) => item.confidence === confidence);

  function applyPreset(preset: typeof strategyPresets[number]) {
    setBudgetUsd(preset.budget);
    setHorizonMonths("36");
    setObjective("maximizeNetSavings");
    setAnnualOperatingCostUsd("10000");
    setPortfolioOverlapPercent("25");
    setPriorities(preset.priorities);
    setResult(null);
    setError(null);
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || hasFieldErrors) return;
    setLoading(true);
    setError(null);
    try {
      const request: StrategyGenerationRequest = {
        budgetUsd: numericBudget,
        horizonMonths: numericHorizon,
        objective,
        annualOperatingCostUsd: numericOperatingCost,
        portfolioOverlapPercent: numericOverlap,
        priorities: priorities.trim(),
      };
      const response = await fetch("/api/strategy/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(body));
      setResult(body as StrategyGenerationResponse);
      setConfidence("BASE");
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "The investment strategy could not be generated.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="strategy-section" aria-labelledby="strategy-title">
      <header className="strategy-section-heading">
        <div>
          <h2 id="strategy-title">Investment strategy generator</h2>
          <p>Set your financial guardrails and priorities. Gemini proposes evidence-supported options; the backend calculates and compares the financial outcomes.</p>
        </div>
        <InfoControl label="Investment strategy assumptions" title="How recommendations work">
          Gemini selects and explains available intervention types and proposes priority shares. It does not calculate ROI or payback. The backend sizes rollout coverage from Northwind complaint, account, and unit-cost evidence, then calculates each portfolio. Effect ranges, operating costs, and rollout capacities are planning assumptions, not measured effects or approved project quotes.
        </InfoControl>
      </header>

      <div className="strategy-presets" aria-label="Strategy presets">
        <span>Try a scenario</span>
        {strategyPresets.map((preset) => <button key={preset.id} type="button" onClick={() => applyPreset(preset)}>{preset.label}</button>)}
      </div>

      <form className="strategy-form" onSubmit={generate}>
        <div className="strategy-global-fields strategy-brief-fields">
          <label className="strategy-field">
            <span>Available investment budget <b>USD</b></span>
            <span className={`money-input${fieldErrors.budget ? " has-error" : ""}`}><span>$</span><input aria-label="Available investment budget in USD" aria-invalid={Boolean(fieldErrors.budget)} aria-describedby="budget-error" type="number" min="1000" step="1000" value={budgetUsd} onChange={(event) => setBudgetUsd(event.target.value)} /></span>
            {fieldErrors.budget && <small className="field-error" id="budget-error">{fieldErrors.budget}</small>}
          </label>
          <label className="strategy-field">
            <span>Planning horizon <b>months</b></span>
            <input aria-label="Planning horizon in months" aria-invalid={Boolean(fieldErrors.horizon)} aria-describedby="horizon-error" className={`strategy-input${fieldErrors.horizon ? " has-error" : ""}`} type="number" min="1" max="120" step="1" value={horizonMonths} onChange={(event) => setHorizonMonths(event.target.value)} />
            {fieldErrors.horizon && <small className="field-error" id="horizon-error">{fieldErrors.horizon}</small>}
          </label>
          <label className="strategy-field">
            <span>Optimization objective</span>
            <select aria-label="Optimization objective" className="strategy-input" value={objective} onChange={(event) => setObjective(event.target.value as StrategyGenerationRequest["objective"])}>
              <option value="maximizeNetSavings">Maximize net savings</option>
              <option value="maximizeRoi">Maximize ROI</option>
              <option value="minimizePayback">Shortest payback</option>
            </select>
          </label>
          <label className="strategy-field">
            <span>Annual operating-cost budget <b>USD/year</b></span>
            <span className={`money-input${fieldErrors.operatingCost ? " has-error" : ""}`}><span>$</span><input aria-label="Annual operating cost budget in USD" aria-invalid={Boolean(fieldErrors.operatingCost)} aria-describedby="operating-cost-error" type="number" min="0" step="500" value={annualOperatingCostUsd} onChange={(event) => setAnnualOperatingCostUsd(event.target.value)} /></span>
            {fieldErrors.operatingCost && <small className="field-error" id="operating-cost-error">{fieldErrors.operatingCost}</small>}
          </label>
          <label className="strategy-field overlap-field">
            <span>Portfolio benefit overlap <b>%</b></span>
            <input aria-label="Portfolio benefit overlap percent" aria-invalid={Boolean(fieldErrors.overlap)} aria-describedby="overlap-error" className={`strategy-input${fieldErrors.overlap ? " has-error" : ""}`} type="number" min="0" max="100" step="5" value={portfolioOverlapPercent} onChange={(event) => setPortfolioOverlapPercent(event.target.value)} />
            <small>Discount applied to additional actions to limit double-counting.</small>
            {fieldErrors.overlap && <small className="field-error" id="overlap-error">{fieldErrors.overlap}</small>}
          </label>
        </div>
        <label className="strategy-field strategy-priorities">
          <span>Priorities or constraints <b>optional</b></span>
          <textarea aria-label="Strategy priorities and constraints" rows={3} maxLength={1000} value={priorities} onChange={(event) => setPriorities(event.target.value)} placeholder="For example: Prioritize estimated-read complaints in low smart-meter regions; favor actions that can start within 12 months." />
          <small>{priorities.length}/1000 · Do not include customer names, account numbers, or personal data.</small>
        </label>
        <div className="strategy-form-footer">
          <p>Gemini proposes options and priority shares. Financial calculations stay deterministic; larger budgets fund more rollout coverage, with explicit 10% / 20% / 30% impact assumptions scaled to funded capacity.</p>
          <Button type="submit" disabled={loading || hasFieldErrors}>
            {loading ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            {loading ? "Generating strategy…" : "Generate investment strategy"}
            {!loading && <ArrowRight size={15} aria-hidden="true" />}
          </Button>
        </div>
      </form>

      {error && <p className="api-error strategy-error" role="alert">{error}</p>}
      {result && selected && <StrategyResults result={result} selected={selected} confidence={confidence} setConfidence={setConfidence} drawer={drawer} setDrawer={setDrawer} />}
    </section>
  );
}

function StrategyResults({
  result,
  selected,
  confidence,
  setConfidence,
  drawer,
  setDrawer,
}: {
  result: StrategyGenerationResponse;
  selected: StrategyConfidenceResult;
  confidence: ConfidenceLevel;
  setConfidence: (confidence: ConfidenceLevel) => void;
  drawer: DrawerKind;
  setDrawer: (drawer: DrawerKind) => void;
}) {
  const comparisonMetrics: { label: string; value: (caseResult: StrategyConfidenceResult) => string }[] = [
    { label: "Allocated", value: (item) => formatMoney(item.allocatedUsd) },
    { label: "Annual net savings", value: (item) => formatMoney(item.annualNetSavingsUsd) },
    { label: "Horizon net benefit", value: (item) => formatMoney(item.horizonNetBenefitUsd) },
    { label: "ROI", value: (item) => item.roiPercent === null ? "—" : `${percent.format(item.roiPercent)}%` },
    { label: "Payback", value: (item) => displayPayback(item.paybackMonths) },
  ];

  return (
    <section className="strategy-results" aria-live="polite" aria-labelledby="strategy-results-title">
      <header className="strategy-result-header">
        <div><div className="strategy-badges"><span className="source-badge source-gemini">Gemini suggestion</span><span className="source-badge source-calculated">Backend calculation</span><span className="source-badge source-assumption">Planning assumptions</span></div><h3 id="strategy-results-title">{result.aiStrategy.title}</h3><p>{result.aiStrategy.summary}</p></div>
        <label className="confidence-select"><span>Scenario case</span><select aria-label="Scenario confidence case" value={confidence} onChange={(event) => setConfidence(event.target.value as ConfidenceLevel)}>{result.confidenceStrategies.map((item) => <option value={item.confidence} key={item.confidence}>{item.confidence[0] + item.confidence.slice(1).toLowerCase()}</option>)}</select></label>
      </header>

      <div className="ai-recommendation-list" aria-label="Gemini-recommended options">
        {result.aiStrategy.recommendedInterventions.map((item, index) => (
          <article className="ai-recommendation-card" key={item.id}>
            <span className="recommendation-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div className="recommendation-copy"><div className="recommendation-name"><h4>{item.name}</h4><span className={item.selectedInBaseCase ? "recommendation-status funded" : "recommendation-status"}>{item.selectedInBaseCase ? "In base plan" : "Not selected"}</span></div><p><strong>What it funds:</strong> {item.description}</p><p><strong>Why it is suggested:</strong> {item.rationale}</p><small>Evidence basis: {item.eligibleEventsPerYear.toLocaleString()} {item.eventLabel} per year · {formatMoney(item.savingsPerEventUsd)} saved per event</small></div>
            <div className="recommendation-allocation"><strong>{formatMoney(item.suggestedAllocationUsd, true)}</strong><span>estimated implementation</span><span>{percent.format(item.suggestedAllocationPercent)}% priority share</span></div>
          </article>
        ))}
      </div>

      <div className="strategy-kpis">
        <div><span>Investment allocated <InfoControl label="Investment allocated definition">The one-time implementation investment selected by the deterministic calculator.</InfoControl></span><strong>{formatMoney(selected.allocatedUsd, true)}</strong><small>{formatMoney(selected.unallocatedBudgetUsd, true)} budget remaining</small></div>
        <div><span>Annual net savings <InfoControl label="Annual net savings definition">Projected annual gross savings after annual operating costs.</InfoControl></span><strong>{formatMoney(selected.annualNetSavingsUsd, true)}</strong><small>after annual operating costs</small></div>
        <div><span>Net benefit · {selected.horizonMonths} months <InfoControl label="Net benefit definition">Savings over the selected horizon minus the initial investment and operating costs.</InfoControl></span><strong>{formatMoney(selected.horizonNetBenefitUsd, true)}</strong><small>after investment and operating costs</small></div>
        <div><span>Simple payback <InfoControl label="Simple payback definition">Months until cumulative annual net savings recover the initial investment.</InfoControl></span><strong>{displayPayback(selected.paybackMonths)}</strong><small>ROI: {selected.roiPercent === null ? "—" : `${percent.format(selected.roiPercent)}%`}</small></div>
      </div>
      {selected.allocations.length === 0 ? (
        <div className="no-investment"><strong>No investment recommended for this case.</strong><p>Gemini’s suggestions are listed above, but none has positive projected net benefit for the selected objective, budget, and horizon. Review the brief, costs, or impact assumptions.</p></div>
      ) : (
        <>
          <div className="strategy-allocation-heading"><div><h4>Selected investment plan</h4><p>Chosen by the calculator for the {selected.confidence.toLowerCase()} case.</p></div><span>{selected.confidence.toLowerCase()} case</span></div>
          <ol className="strategy-allocation-list">
            {selected.allocations.map((allocation, index) => (
              <li key={allocation.id}>
                <span className="allocation-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div className="allocation-copy"><strong>{allocation.name}</strong><span>Targets {allocation.eventLabel}. Assumed improvement: {allocation.impactPercent}%.</span><small>Source: {allocation.source} · Overlap adjustment: {allocation.overlapDiscountPercent}%</small></div>
                <div className="allocation-money"><strong>{formatMoney(allocation.allocationUsd, true)}</strong><span>investment</span></div>
                <details className="allocation-calculation"><summary aria-label={`Show calculation for ${allocation.name}`}>Calculation</summary><p>{allocation.calculation}</p><p>Annual gross contribution: {formatMoney(allocation.incrementalAnnualGrossSavingsUsd)}</p></details>
              </li>
            ))}
          </ol>
        </>
      )}
      <div className="strategy-result-footnote">
        <span>Per year: {selected.estimatedComplaintsAvoidedPerYear.toLocaleString()} complaints avoided · {selected.estimatedTransfersReducedPerYear.toLocaleString()} transfers reduced</span>
        <span>{selected.confidence.toLowerCase()} case · {result.baselineObservedMonths ?? "—"} months of observed data · USD</span>
      </div>
      <div className="result-actions strategy-result-actions">
        <Button variant="outline" onClick={() => setDrawer("assumptions")}>View assumptions</Button>
        <Button variant="outline" onClick={() => setDrawer("evidence")}>View evidence &amp; calculations</Button>
        <Button variant="outline" onClick={() => setDrawer("compare")}>Compare cases</Button>
      </div>
      {result.dataLimitations.map((limitation) => <p className="strategy-limitation" key={limitation}>{limitation}</p>)}
      <EvidenceDrawer open={drawer !== null} onClose={() => setDrawer(null)} title={drawer === "assumptions" ? "Assumptions" : drawer === "evidence" ? "Evidence and calculations" : "Confidence case comparison"} eyebrow="Investment planning · USD">
        {drawer === "compare" ? <ComparisonTable strategies={result.confidenceStrategies} metrics={comparisonMetrics} /> : drawer === "assumptions" ? <AssumptionsList result={result} /> : <EvidenceList result={result} selected={selected} />}
      </EvidenceDrawer>
    </section>
  );
}

function ComparisonTable({ strategies, metrics }: { strategies: StrategyConfidenceResult[]; metrics: { label: string; value: (caseResult: StrategyConfidenceResult) => string }[] }) {
  return <div className="table-scroll comparison-table"><table><thead><tr><th>Metric</th>{strategies.map((item) => <th key={item.confidence}>{item.confidence[0] + item.confidence.slice(1).toLowerCase()}</th>)}</tr></thead><tbody>{metrics.map((metric) => <tr key={metric.label}><th>{metric.label}</th>{strategies.map((item) => <td key={item.confidence}>{metric.value(item)}</td>)}</tr>)}</tbody></table></div>;
}

function AssumptionsList({ result }: { result: StrategyGenerationResponse }) {
  return <div className="strategy-drawer-content">
    <p className="drawer-lede">Gemini recommends intervention options and priority shares from the available evidence. The backend calculates USD allocations and returns using source-derived implementation-cost proxies. Effect ranges and costs remain planning assumptions; replace them with reviewed estimates.</p>
    <dl className="evidence-values">
      <div><dt>Budget</dt><dd>{formatMoney(result.planningInputs.budgetUsd)}</dd></div>
      <div><dt>Planning horizon</dt><dd>{result.planningInputs.horizonMonths} months</dd></div>
      <div><dt>Optimization objective</dt><dd>{result.planningInputs.objective}</dd></div>
      <div><dt>Annual operating-cost budget</dt><dd>{formatMoney(result.planningInputs.annualOperatingCostUsd)}</dd></div>
      <div><dt>Portfolio overlap assumption</dt><dd>{percent.format(result.planningInputs.portfolioOverlapPercent)}%</dd></div>
      {result.planningInputs.priorities && <div><dt>User priorities</dt><dd className="calculation-text">{result.planningInputs.priorities}</dd></div>}
      {result.assumptions.map((item) => <div key={item}><dt>Calculation assumption</dt><dd className="calculation-text">{item}</dd></div>)}
      {result.aiStrategy.caveats.map((item) => <div key={item}><dt>Gemini caveat</dt><dd className="calculation-text">{item}</dd></div>)}
    </dl>
  </div>;
}

function EvidenceList({ result, selected }: { result: StrategyGenerationResponse; selected: StrategyConfidenceResult }) {
  return <div className="strategy-drawer-content">
    <p className="drawer-lede">Northwind event baselines and costs come from the source CSVs. Gemini-suggested shares and rationales are proposals, not source facts.</p>
    <dl className="evidence-values">
      {selected.allocations.map((item) => <div key={item.id}><dt>{item.name}<small>{item.source}</small><small>{item.calculation}</small></dt><dd>{formatMoney(item.incrementalAnnualGrossSavingsUsd)} / year</dd></div>)}
      {selected.calculation.map((item) => <div key={item}><dt>Portfolio calculation</dt><dd className="calculation-text">{item}</dd></div>)}
      <div><dt>Baseline period</dt><dd>{result.baselineObservedMonths ?? "Unavailable"} months</dd></div>
      {result.dataLimitations.map((item) => <div key={item}><dt>Data limitation</dt><dd className="calculation-text">{item}</dd></div>)}
    </dl>
  </div>;
}
