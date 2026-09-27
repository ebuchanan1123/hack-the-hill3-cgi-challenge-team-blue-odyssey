import type { Metadata } from "next";
import { Geist, Newsreader } from "next/font/google";
import { AppSidebar } from "@/components/pulse/app-sidebar";
import "./globals.css";
const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const display = Newsreader({ subsets: ["latin"], variable: "--font-display", axes: ["opsz"] });
export const metadata: Metadata = { title: "Northwind Pulse", description: "Utility operations and investment planning." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" className={`${sans.variable} ${display.variable}`}><body><a className="skip-link" href="#main-content">Skip to content</a><AppSidebar /><main id="main-content" className="main-content">{children}</main></body></html>; }
