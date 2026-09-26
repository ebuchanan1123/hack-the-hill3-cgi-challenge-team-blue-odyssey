"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { PageHeader, levelLabel, levelOrder, priorityLevel } from "@/components/pulse/shared";
import { deadlineOrder, getDeadline } from "@/lib/deadline";
import { ComplaintTable, EmptyResults } from "./operations-tables";
import { ComplaintDetailSheet } from "./detail-sheets";
import type { Complaint, ComplaintStatus } from "@/types/pulse";
export function Complaints({ complaints, statuses }: { complaints: Complaint[]; statuses: Record<string, ComplaintStatus> }) {
  const [query, setQuery] = useState(""); const [filters, setFilters] = useState<Record<string, string>>({}); const [selected, setSelected] = useState<Complaint | null>(null);
  const plain = (values: string[]) => [...new Set(values)].map(value => ({ value, label: value }));
  const levels = (values: string[]) => [...new Set(values)].sort((a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b)).map(value => ({ value, label: levelLabel(value) }));
  const options = { Category: plain(complaints.map(c => c.category)), Region: plain(complaints.map(c => c.region)), Priority: levels(complaints.map(c => priorityLevel(c.priority))), Status: plain(Object.values(statuses)), Deadline: deadlineOrder.filter(state => complaints.some(c => getDeadline(c)?.state === state)).map(value => ({ value, label: value })) };
  const rows = complaints.filter(c => { const values: Record<string, string> = { Category: c.category, Region: c.region, Priority: priorityLevel(c.priority), Status: statuses[c.id], Deadline: getDeadline(c)?.state ?? "" }; return Object.entries(filters).every(([key, value]) => !value || values[key] === value) && `${c.id} ${c.category} ${c.region}`.toLowerCase().includes(query.trim().toLowerCase()); });
  return <><PageHeader title="Complaints" /><label className="search-box"><Search size={16} /><span className="sr-only">Search complaints</span><input placeholder="Search complaints…" value={query} onChange={e => setQuery(e.target.value)} /></label><div className="filters">{Object.entries(options).map(([label, values]) => <label key={label}><span>{label}</span><select aria-label={label} value={filters[label] ?? ""} onChange={e => setFilters({ ...filters, [label]: e.target.value })}><option value="">All</option>{values.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>)}</div><section className="table-section">{rows.length ? <ComplaintTable complaints={rows} statuses={statuses} selectedId={selected?.id} onSelect={setSelected} /> : <EmptyResults onReset={() => { setFilters({}); setQuery(""); }} />}</section><p className="table-count" role="status">{rows.length} of {complaints.length} complaints</p><ComplaintDetailSheet complaint={selected} status={selected ? statuses[selected.id] : undefined} onClose={() => setSelected(null)} /></>;
}
