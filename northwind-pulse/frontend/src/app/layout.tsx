import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Northwind Pulse | Health",
  description: "Northwind Pulse project health check.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full font-sans antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
