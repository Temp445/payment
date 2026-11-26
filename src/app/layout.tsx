import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Cashfree Fast Preconnect & DNS Prefetch for ultra-fast popup load (<1-2s) */}
        <link rel="preconnect" href="https://sdk.cashfree.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://payments.cashfree.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.cashfree.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://sandbox.cashfree.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://payments-test.cashfree.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://js.sentry-cdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://sdk.cashfree.com" />
        <link rel="dns-prefetch" href="https://payments.cashfree.com" />
        <link rel="dns-prefetch" href="https://api.cashfree.com" />
        <link rel="dns-prefetch" href="https://sandbox.cashfree.com" />
        <link rel="preload" href="https://sdk.cashfree.com/js/v3/cashfree.js" as="script" />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('payment_hub_theme') || 'dark';
                  document.documentElement.classList.add(t);
                  document.documentElement.style.colorScheme = t;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
