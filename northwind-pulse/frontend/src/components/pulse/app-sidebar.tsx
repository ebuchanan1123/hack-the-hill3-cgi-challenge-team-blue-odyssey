"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, ListTodo, Layers3 } from "lucide-react";
const navigation = [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, { href: "/complaints", label: "Complaints", icon: ListTodo }, { href: "/decision-twin", label: "Decision Twin", icon: Layers3 }];
export function AppSidebar() {
  const pathname = usePathname();
  return <aside className="sidebar"><Link href="/dashboard" className="brand"><Activity size={23} /><span>Northwind <strong>Pulse</strong></span></Link><nav aria-label="Main navigation">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={17} />{label}</Link>)}</nav></aside>;
}
