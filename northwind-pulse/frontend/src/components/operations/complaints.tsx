"use client";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { PageHeader, levelLabel, priorityLevel } from "@/components/pulse/shared";
import { PageActions } from "@/components/pulse/page-actions";
import { deadlineOrder, getDeadline } from "@/lib/deadline";
import { ComplaintTable, EmptyResults } from "./operations-tables";
import { ComplaintDetailSheet } from "./detail-sheets";
import type { Complaint, ComplaintStatus } from "@/types/pulse";
export function Complaints({ complaints: initialComplaints, statuses: initialStatuses, total, offset: initialOffset, limit }: { complaints: Complaint[]; statuses: Record<string, ComplaintStatus>; total: number; offset: number; limit: number }) {
  const [complaints, setComplaints] = useState(initialComplaints);
  const [statuses, setStatuses] = useState(initialStatuses);
  const [offset, setOffset] = useState(initialOffset);
  const [totalCount, setTotalCount] = useState(total);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("recent");
  const [query, setQuery] = useState(""); const [filters, setFilters] = useState<Record<string, string>>({}); const [selected, setSelected] = useState<Complaint | null>(null);
  const plain = (values: string[]) => [...new Set(values)].map(value => ({ value, label: value }));
  const options = { Category: plain(complaints.map(c => c.category)), Region: plain(complaints.map(c => c.region)), Priority: [{ value: "P1", label: "High" }, { value: "P2", label: "Medium" }, { value: "P3", label: "Low" }], Status: [{ value: "Open", label: "Open" }, { value: "Closed", label: "Closed" }, { value: "Closed - reopened", label: "Closed - reopened" }], Deadline: deadlineOrder.map(value => ({ value, label: value })) };
  const rows = complaints.filter(c => { const values: Record<string, string> = { Category: c.category, Region: c.region, Priority: c.priority, Status: statuses[c.id], Deadline: getDeadline(c)?.state ?? "" }; return Object.entries(filters).every(([key, value]) => !value || values[key] === value) && `${c.id} ${c.category} ${c.region}`.toLowerCase().includes(query.trim().toLowerCase()); });
  const active = Object.values(filters).some(Boolean) || query.trim() !== "" || sort !== "recent";
  const reset = () => { setFilters({}); setQuery(""); setSort("recent"); };
  useEffect(() => {
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ offset: "0", limit: String(limit), sort });
      if (query.trim()) params.set("search", query.trim());
      const filterMap: Record<string, string> = { Category: "category", Region: "region", Priority: "priority", Status: "status", Deadline: "deadline" };
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(filterMap[key], value); });
      setLoading(true);
      try {
        const response = await fetch(`/api/complaints?${params.toString()}`);
        if (!response.ok) return;
        const body = await response.json() as { items?: Complaint[]; total?: number; offset?: number };
        const nextComplaints = body.items ?? [];
        setComplaints(nextComplaints);
        setStatuses(Object.fromEntries(nextComplaints.map((complaint) => [complaint.id, complaint.status ?? "Open"])) as Record<string, ComplaintStatus>);
        setTotalCount(body.total ?? nextComplaints.length);
        setOffset(body.offset ?? 0);
        setSelected(null);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [filters, query, sort, limit]);
  async function changePage(nextOffset: number) {
    if (nextOffset < 0 || nextOffset >= totalCount || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ offset: String(nextOffset), limit: String(limit), sort });
      if (query.trim()) params.set("search", query.trim());
      const filterMap: Record<string, string> = { Category: "category", Region: "region", Priority: "priority", Status: "status", Deadline: "deadline" };
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(filterMap[key], value); });
      const response = await fetch(`/api/complaints?${params.toString()}`);
      if (!response.ok) throw new Error("Unable to load complaints");
      const body = await response.json() as { items?: Complaint[]; total?: number; offset?: number };
      setComplaints(body.items ?? []);
      setStatuses(Object.fromEntries((body.items ?? []).map((complaint) => [complaint.id, complaint.status ?? "Open"])) as Record<string, ComplaintStatus>);
      setOffset(nextOffset);
      setTotalCount(body.total ?? totalCount);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }
  const exportRows = () => [["Complaint", "Category", "Region", "Priority", "Days open", "Deadline", "Status"], ...rows.map(c => [c.id, c.category, c.region, levelLabel(priorityLevel(c.priority)), c.daysOpen, getDeadline(c)?.label ?? "", statuses[c.id] ?? ""])];
  const pageNumber = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(totalCount / limit));
  return <><PageHeader title="Complaints" actions={<PageActions exportName="northwind-complaints" getRows={exportRows} />} /><div className="toolbar"><label className="search-box"><Search size={16} /><span className="sr-only">Search complaints</span><input placeholder="Search ID, category, region…" value={query} onChange={e => setQuery(e.target.value)} /></label><div className="filters">{Object.entries(options).map(([label, values]) => <label key={label} className={`filter-${label.toLowerCase()}${filters[label] ? " is-active" : ""}`}><span className="filter-name" aria-hidden="true">{label}</span><span className="filter-value" aria-hidden="true">{values.find(option => option.value === filters[label])?.label ?? "All"}</span><select aria-label={label} value={filters[label] ?? ""} onChange={e => { setFilters({ ...filters, [label]: e.target.value }); setOffset(0); }}><option value="">All</option>{values.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>)}<label className={`sort-control${sort !== "recent" ? " is-active" : ""}`}><span>Sort by</span><select aria-label="Sort complaints" value={sort} onChange={e => { setSort(e.target.value); setOffset(0); }}><option value="recent">Most recent</option><option value="status">Open first</option><option value="priority">High priority first</option></select></label>{active && <button type="button" className="clear-filters" onClick={reset} aria-label="Clear all filters" title="Clear all filters"><X size={13} aria-hidden="true" /><span className="clear-text">Clear</span></button>}</div><p className="table-count" role="status">{active ? `${rows.length} matches on page` : `${offset + 1}-${Math.min(offset + limit, totalCount)} of ${totalCount} complaints`}</p></div><section className={`table-section${loading ? " is-loading" : ""}`}>{rows.length ? <ComplaintTable complaints={rows} statuses={statuses} selectedId={selected?.id} onSelect={setSelected} /> : <EmptyResults onReset={reset} />}</section><nav className="pagination" aria-label="Complaint pages"><button type="button" onClick={() => void changePage(offset - limit)} disabled={offset === 0 || loading}>Previous</button><span>Page {pageNumber} of {pageCount}</span><button type="button" onClick={() => void changePage(offset + limit)} disabled={offset + limit >= totalCount || loading}>Next</button></nav><ComplaintDetailSheet complaint={selected} status={selected ? statuses[selected.id] : undefined} onClose={() => setSelected(null)} /></>;
}
