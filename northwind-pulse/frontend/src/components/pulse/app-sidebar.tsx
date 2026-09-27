"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, ListTodo, Layers3, Menu, ReceiptText } from "lucide-react";
const navigation = [{ href: "/dashboard", label: "Operations", icon: LayoutDashboard }, { href: "/complaints", label: "Complaints", icon: ListTodo }, { href: "/flagged-bills", label: "Flagged bills", icon: ReceiptText }, { href: "/decision-twin", label: "Decision Twin", icon: Layers3 }];
export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  return <aside className="sidebar" data-collapsed={collapsed}><div className="sidebar-top"><Link href="/dashboard" className="brand" hidden={collapsed}><Activity size={23} /><span>Northwind <strong>Pulse</strong></span></Link><button type="button" className="sidebar-toggle" aria-label={collapsed ? "Open sidebar" : "Close sidebar"} title={collapsed ? "Open sidebar" : "Close sidebar"} aria-expanded={!collapsed} aria-controls="sidebar-content" onClick={() => setCollapsed(value => !value)}><Menu size={19} strokeWidth={1.8} /></button></div><div id="sidebar-content" hidden={collapsed}><nav aria-label="Main navigation">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={17} />{label}</Link>)}</nav></div></aside>;
}
