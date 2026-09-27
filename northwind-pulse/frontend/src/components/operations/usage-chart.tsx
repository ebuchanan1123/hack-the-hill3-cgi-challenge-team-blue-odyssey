"use client";

import { Bar, Cell, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { UsagePoint } from "@/types/pulse";

export function UsageChart({ history }: { history: UsagePoint[] }) {
  // One value per category avoids grouped Bar slots shifting sparse series.
  const usageHistory = history.map(point => ({
    month: point.month,
    displayUsage: point.estimate ?? point.recorded,
    typical: point.expected,
    isEstimate: point.estimate !== undefined,
  }));
  const september = usageHistory.find(point => point.month === "Sep" && point.isEstimate);
  const formatUsage = (value: number) => new Intl.NumberFormat("en-CA").format(value);
  return <figure className="usage-chart"><div className="section-heading"><h3>Usage history</h3><span>kWh</span></div>
    <div className="chart-canvas" role="img" aria-label="Monthly usage compared with typical usage. The latest estimate is highlighted in amber.">
      <ResponsiveContainer width="100%" height="100%"><ComposedChart data={usageHistory} margin={{ top: 15, right: 12, bottom: 0, left: 12 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e3e8ee" />
        <XAxis dataKey="month" type="category" scale="band" interval={0} tickLine={false} axisLine={false} tick={{ fill: "#69788a", fontSize: 11 }} dy={8} />
        <YAxis width={40} tickLine={false} axisLine={false} tick={{ fill: "#69788a", fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #dfe5eb", fontSize: 12 }} />
        <Bar dataKey="displayUsage" name="Usage / estimate (kWh)" radius={[4, 4, 0, 0]} barSize={28} isAnimationActive={false}>
          {usageHistory.map(point => <Cell key={point.month} fill={point.isEstimate ? "#d49939" : "#c4d4e6"} />)}
        </Bar>
        <Line dataKey="typical" name="Typical usage (kWh)" stroke="#416ca3" strokeWidth={2} strokeDasharray="4 4" dot={({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { month: string; isEstimate: boolean } }) => (
          payload?.month === "Sep" && payload.isEstimate
            ? <circle className="september-typical-point" cx={cx} cy={cy} r={5} fill="white" stroke="#416ca3" strokeWidth={2.5} />
            : <g />
        )} isAnimationActive={false} />
      </ComposedChart></ResponsiveContainer>
    </div><figcaption><span className="legend-item"><i className="legend-usage" />Usage</span><span className="legend-item"><i className="legend-expected" />Typical</span><span className="legend-item"><i className="legend-estimate" />New estimate</span></figcaption>
    {september && <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]" aria-label="September usage comparison">
      <span className="text-slate-500">Sep</span>
      <span className="text-[#416ca3]">Typical <strong className="font-medium">~{formatUsage(september.typical)} kWh</strong></span>
      <span className="text-[#88651e]">Estimate <strong className="font-medium">{formatUsage(september.displayUsage!)} kWh</strong></span>
    </div>}
    <details className="chart-data"><summary>View chart data</summary><table><thead><tr><th>Month</th><th>Typical</th><th>Usage / estimate</th></tr></thead><tbody>{history.map(point => <tr key={point.month}><th>{point.month}</th><td>{point.expected} kWh</td><td>{point.recorded ?? point.estimate} kWh{point.estimate !== undefined ? " (estimate)" : ""}</td></tr>)}</tbody></table></details>
  </figure>;
}
