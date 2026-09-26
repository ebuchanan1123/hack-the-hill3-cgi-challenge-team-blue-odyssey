"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { UsagePoint } from "@/types/pulse";

export function UsageChart({ history }: { history: UsagePoint[] }) {
  return <figure className="usage-chart"><div className="section-heading"><h3>Usage history</h3><span>kWh</span></div>
    <div className="chart-canvas" role="img" aria-label="Monthly usage compared with typical usage. The latest estimate is highlighted in amber.">
      <ResponsiveContainer width="100%" height="100%"><ComposedChart data={history} margin={{ top: 15, right: 10, bottom: 0, left: -20 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e3e8ee" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#69788a", fontSize: 11 }} dy={8} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#69788a", fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #dfe5eb", fontSize: 12 }} />
        <Bar dataKey="recorded" name="Usage (kWh)" fill="#c4d4e6" radius={[4, 4, 0, 0]} barSize={28} isAnimationActive={false} />
        <Bar dataKey="estimate" name="New estimate (kWh)" fill="#d49939" radius={[4, 4, 0, 0]} barSize={28} isAnimationActive={false} />
        <Line dataKey="expected" name="Typical usage (kWh)" stroke="#416ca3" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
      </ComposedChart></ResponsiveContainer>
    </div><figcaption><span className="legend-item"><i className="legend-usage" />Usage</span><span className="legend-item"><i className="legend-expected" />Typical</span><span className="legend-item"><i className="legend-estimate" />New estimate</span></figcaption>
    
    <details className="chart-data"><summary>View chart data</summary><table><thead><tr><th>Month</th><th>Typical</th><th>Usage / estimate</th></tr></thead><tbody>{history.map(point => <tr key={point.month}><th>{point.month}</th><td>{point.expected} kWh</td><td>{point.recorded ?? point.estimate} kWh{point.estimate !== undefined ? " (estimate)" : ""}</td></tr>)}</tbody></table></details>
  </figure>;
}
