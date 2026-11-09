import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Centralized Payment Hub | Cashfree + Supabase",
  description: "Multi-tenant payment aggregation and orchestration platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}

