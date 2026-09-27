"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Check, Download, Share2 } from "lucide-react";

export type ExportRows = (string | number)[][];

function toCsv(rows: ExportRows) { return rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"); }

/** Share copies the current page link; Export downloads the page's data as CSV. */
export function PageActions({ period, exportName, getRows }: { period?: string; exportName: string; getRows: () => ExportRows }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(timer); }, [copied]);
  async function share() { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); } catch { /* clipboard unavailable: leave the button unchanged */ } }
  function exportReport() {
    const url = URL.createObjectURL(new Blob([toCsv(getRows())], { type: "text/csv;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `${exportName}.csv` });
    link.click(); URL.revokeObjectURL(url);
  }
  return <div className="page-actions">
    {period && <span className="period-chip"><CalendarDays size={15} aria-hidden="true" />{period}</span>}
    <button type="button" className="action-button" onClick={share}>{copied ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}<span aria-live="polite">{copied ? "Link copied" : "Share"}</span></button>
    <button type="button" className="action-button primary" onClick={exportReport}><Download size={15} aria-hidden="true" />Export report</button>
  </div>;
}
