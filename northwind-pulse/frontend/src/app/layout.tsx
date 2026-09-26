import type { Metadata } from "next";
import { AppSidebar } from "@/components/pulse/app-sidebar";
import "./globals.css";
export const metadata: Metadata = { title: "Northwind Pulse", description: "Utility operations and investment planning." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><AppSidebar /><main id="main-content" className="main-content">{children}</main></body></html>; }
