"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import {
  Code2,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  CreditCard,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Server,
  FileCode,
  Atom,
  Zap,
  Bot,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface CodeBlockProps {
  title: string;
  language?: string;
  code: string;
  filePath?: string;
}

function CodeBlock({ title, code, filePath }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/90 overflow-hidden shadow-lg mb-6">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/80">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-slate-200">{title}</span>
          {filePath && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700/60 text-slate-400 font-mono">
              {filePath}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-slate-700/80 hover:bg-slate-700 text-slate-200 transition font-medium"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto font-mono text-xs text-slate-300 leading-relaxed">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

const NEXTJS_AI_AGENT_PROMPT = `You are an expert Next.js developer. Integrate Central Payment Hub checkout into this Next.js application by following these instructions step-by-step. Implement all files, install dependencies, and configure environment variables automatically without asking any clarifying questions:

### Step 1: Install Cashfree SDK
Run this command in the project terminal:
npm install @cashfreepayments/cashfree-js

### Step 2: Configure Environment Variables
Add the following configuration to the application's ".env.local" file:
# Central Payment Hub Client Configuration
# (Replace <YOUR_PUBLIC_CLIENT_ID> with your registered Client ID from Central Payment Hub /apps)
NEXT_PUBLIC_PAYMENT_HUB_URL="http://localhost:3000/api/v1"
NEXT_PUBLIC_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"

### Step 3: Create Next.js Hook (hooks/usePaymentHub.ts)
Create the file "hooks/usePaymentHub.ts" (or "src/hooks/usePaymentHub.ts"):
\`\`\`typescript
"use client";

import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

export interface InitiatePaymentParams {
  orderId?: string;
  amount: number;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  orderNote?: string;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

export function usePaymentHub() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async ({
    orderId = \`ORD_\${Date.now()}_\${Math.floor(Math.random() * 1000)}\`,
    amount,
    customerPhone = "9876543210",
    customerName = "Valued Customer",
    customerEmail = "customer@example.com",
    orderNote = "Next.js Web Order",
    onSuccess,
    onFailure,
  }: InitiatePaymentParams) => {
    setLoading(true);
    setError(null);

    const hubUrl =
      process.env.NEXT_PUBLIC_PAYMENT_HUB_URL || "http://localhost:3000/api/v1";
    const clientId =
      process.env.NEXT_PUBLIC_PAYMENT_HUB_CLIENT_ID || "";

    try {
      // 1. Direct browser call to Central Payment Hub (CORS is enabled)
      const res = await fetch(\`\${hubUrl}/orders\`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": clientId,
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: Number(amount),
          order_currency: "INR",
          customer_details: {
            customer_id: \`CUST_\${customerPhone}\`,
            customer_phone: customerPhone,
            customer_name: customerName,
            customer_email: customerEmail,
          },
          order_note: orderNote,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create payment session");
      }

      const paymentSessionId = data.payment_session_id || data.order?.paymentSessionId;
      if (!paymentSessionId) {
        throw new Error("Missing paymentSessionId from payment hub response");
      }

      // 2. Load Cashfree Checkout Modal SDK
      const cashfree = await load({
        mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      });

      // 3. Mount Drop-in Modal
      const checkoutResult = await cashfree.checkout({
        paymentSessionId: paymentSessionId,
        redirectTarget: "_modal",
      });

      if (checkoutResult.error) {
        // Automatically inform Payment Hub to mark order as cancelled
        try {
          await fetch(\`\${hubUrl}/orders/\${orderId}/cancel\`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-client-id": clientId },
            body: JSON.stringify({ reason: checkoutResult.error.message || "Payment aborted by customer" }),
          });
        } catch {}
        setError(checkoutResult.error.message || "Payment has been aborted. Please try again");
        if (onFailure) onFailure(checkoutResult.error.message || "Payment aborted");
        return;
      }

      // 4. Poll payment status to confirm
      pollPaymentStatus(orderId, hubUrl, clientId, onSuccess, onFailure);
    } catch (err: any) {
      setError(err.message || "Payment failed to launch");
      if (onFailure) onFailure(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = (
    orderId: string,
    hubUrl: string,
    clientId: string,
    onSuccess?: (id: string) => void,
    onFailure?: (err: string) => void
  ) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(\`\${hubUrl}/orders/\${orderId}/status\`, {
          headers: { "x-client-id": clientId },
        });
        const data = await res.json();

        if (data.status === "PAID") {
          clearInterval(interval);
          if (onSuccess) onSuccess(data.latest_payment?.cfPaymentId || "CONFIRMED");
        } else if (attempts >= 6) {
          clearInterval(interval);
          if (onSuccess) onSuccess("PENDING_VERIFICATION");
        }
      } catch (err: any) {
        clearInterval(interval);
        if (onFailure) onFailure("Status polling failed");
      }
    }, 1500);
  };

  return { pay, loading, error };
}
\`\`\`

### Step 4: Create Next.js Component (components/CheckoutButton.tsx)
Create the file "components/CheckoutButton.tsx" (or "src/components/CheckoutButton.tsx"):
\`\`\`tsx
"use client";

import React, { useState } from "react";
import { usePaymentHub } from "@/hooks/usePaymentHub";

interface CheckoutButtonProps {
  amount: number;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  orderNote?: string;
  onSuccess?: (paymentId: string) => void;
  className?: string;
}

export function CheckoutButton({
  amount,
  customerPhone = "9876543210",
  customerName = "Customer",
  customerEmail = "customer@example.com",
  orderNote = "Next.js Web Order Payment",
  onSuccess,
  className,
}: CheckoutButtonProps) {
  const { pay, loading, error } = usePaymentHub();
  const [receipt, setReceipt] = useState<string | null>(null);

  const handleCheckout = () => {
    setReceipt(null);
    pay({
      amount,
      customerPhone,
      customerName,
      customerEmail,
      orderNote,
      onSuccess: (paymentId) => {
        setReceipt(\`🎉 Payment Confirmed! Ref ID: \${paymentId}\`);
        if (onSuccess) onSuccess(paymentId);
      },
      onFailure: (err) => {
        console.warn("Payment checkout notice:", err);
      },
    });
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={
          className ||
          "w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition shadow-md cursor-pointer"
        }
      >
        {loading ? "Opening Cashfree..." : \`Pay ₹\${amount} with Cashfree\`}
      </button>

      {receipt && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          {receipt}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          ❌ {error}
        </div>
      )}
    </div>
  );
}
\`\`\`

### Step 5: Integration & Rules
- Do NOT ask for clientSecret, database connection strings, or backend credentials (browser client uses only NEXT_PUBLIC_PAYMENT_HUB_CLIENT_ID).
- Locate the main pricing, checkout, or cart page in this Next.js app and wire <CheckoutButton amount={...} /> into it.`;

const REACT_AI_AGENT_PROMPT = `You are an expert React frontend developer. Integrate Central Payment Hub checkout into this React application by following these instructions step-by-step. Implement all files, install dependencies, and configure environment variables automatically without asking any clarifying questions:

### Step 1: Install Cashfree SDK
Run this command in the project terminal:
npm install @cashfreepayments/cashfree-js

### Step 2: Configure Environment Variables
Add the following configuration to the application's ".env" file:
# Central Payment Hub Client Configuration (Vite & CRA)
# (Replace <YOUR_PUBLIC_CLIENT_ID> with your registered Client ID from Central Payment Hub /apps)
VITE_PAYMENT_HUB_URL="http://localhost:3000/api/v1"
VITE_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"

# For Create-React-App (CRA):
REACT_APP_PAYMENT_HUB_URL="http://localhost:3000/api/v1"
REACT_APP_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"

### Step 3: Create React Hook (src/hooks/usePaymentHub.ts)
Create the file "src/hooks/usePaymentHub.ts":
\`\`\`typescript
import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

export interface InitiatePaymentParams {
  orderId?: string;
  amount: number;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  orderNote?: string;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

export function usePaymentHub() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async ({
    orderId = \`ORD_\${Date.now()}_\${Math.floor(Math.random() * 1000)}\`,
    amount,
    customerPhone = "9876543210",
    customerName = "Valued Customer",
    customerEmail = "customer@example.com",
    orderNote = "React Store Checkout",
    onSuccess,
    onFailure,
  }: InitiatePaymentParams) => {
    setLoading(true);
    setError(null);

    // Read Vite or CRA environment variables
    const hubUrl =
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_PAYMENT_HUB_URL) ||
      (typeof process !== "undefined" && process.env?.REACT_APP_PAYMENT_HUB_URL) ||
      "http://localhost:3000/api/v1";

    const clientId =
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_PAYMENT_HUB_CLIENT_ID) ||
      (typeof process !== "undefined" && process.env?.REACT_APP_PAYMENT_HUB_CLIENT_ID) ||
      "";

    try {
      // 1. Direct browser call to Central Payment Hub (CORS is enabled)
      const res = await fetch(\`\${hubUrl}/orders\`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": clientId,
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: Number(amount),
          order_currency: "INR",
          customer_details: {
            customer_id: \`CUST_\${customerPhone}\`,
            customer_phone: customerPhone,
            customer_name: customerName,
            customer_email: customerEmail,
          },
          order_note: orderNote,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create payment session");
      }

      const paymentSessionId = data.payment_session_id || data.order?.paymentSessionId;
      if (!paymentSessionId) {
        throw new Error("Missing paymentSessionId from payment hub response");
      }

      // 2. Load Cashfree Checkout Modal SDK
      const isProd =
        (typeof import.meta !== "undefined" && (import.meta as any).env?.PROD) ||
        (typeof process !== "undefined" && process.env?.NODE_ENV === "production");

      const cashfree = await load({
        mode: isProd ? "production" : "sandbox",
      });

      // 3. Mount Drop-in Modal
      const checkoutResult = await cashfree.checkout({
        paymentSessionId: paymentSessionId,
        redirectTarget: "_modal",
      });

      if (checkoutResult.error) {
        // Automatically inform Payment Hub to mark order as cancelled
        try {
          await fetch(\`\${hubUrl}/orders/\${orderId}/cancel\`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-client-id": clientId },
            body: JSON.stringify({ reason: checkoutResult.error.message || "Payment aborted by customer" }),
          });
        } catch {}
        setError(checkoutResult.error.message || "Payment has been aborted. Please try again");
        if (onFailure) onFailure(checkoutResult.error.message || "Payment aborted");
        return;
      }

      // 4. Poll payment status to confirm
      pollPaymentStatus(orderId, hubUrl, clientId, onSuccess, onFailure);
    } catch (err: any) {
      setError(err.message || "Payment failed to launch");
      if (onFailure) onFailure(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = (
    orderId: string,
    hubUrl: string,
    clientId: string,
    onSuccess?: (id: string) => void,
    onFailure?: (err: string) => void
  ) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(\`\${hubUrl}/orders/\${orderId}/status\`, {
          headers: { "x-client-id": clientId },
        });
        const data = await res.json();

        if (data.status === "PAID") {
          clearInterval(interval);
          if (onSuccess) onSuccess(data.latest_payment?.cfPaymentId || "CONFIRMED");
        } else if (attempts >= 6) {
          clearInterval(interval);
          if (onSuccess) onSuccess("PENDING_VERIFICATION");
        }
      } catch (err: any) {
        clearInterval(interval);
        if (onFailure) onFailure("Status polling failed");
      }
    }, 1500);
  };

  return { pay, loading, error };
}
\`\`\`

### Step 4: Create React Component (src/components/CheckoutButton.tsx)
Create the file "src/components/CheckoutButton.tsx":
\`\`\`tsx
import React, { useState } from "react";
import { usePaymentHub } from "../hooks/usePaymentHub";

interface CheckoutButtonProps {
  amount: number;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  orderNote?: string;
  onSuccess?: (paymentId: string) => void;
  className?: string;
}

export function CheckoutButton({
  amount,
  customerPhone = "9876543210",
  customerName = "Customer",
  customerEmail = "customer@example.com",
  orderNote = "React App Checkout",
  onSuccess,
  className,
}: CheckoutButtonProps) {
  const { pay, loading, error } = usePaymentHub();
  const [receipt, setReceipt] = useState<string | null>(null);

  const handleCheckout = () => {
    setReceipt(null);
    pay({
      amount,
      customerPhone,
      customerName,
      customerEmail,
      orderNote,
      onSuccess: (paymentId) => {
        setReceipt(\`🎉 Payment Confirmed! Ref ID: \${paymentId}\`);
        if (onSuccess) onSuccess(paymentId);
      },
      onFailure: (err) => {
        console.warn("Payment checkout notice:", err);
      },
    });
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={
          className ||
          "w-full py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold transition shadow-md cursor-pointer"
        }
      >
        {loading ? "Opening Cashfree..." : \`Pay ₹\${amount} with Cashfree\`}
      </button>

      {receipt && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          {receipt}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          ❌ {error}
        </div>
      )}
    </div>
  );
}
\`\`\`

### Step 5: Integration & Rules
- Do NOT ask for backend server routes, backend database credentials, or secret keys (zero-backend browser integration).
- Wire <CheckoutButton amount={...} /> into the main checkout or pricing component.`;

export default function GuidePage() {
  const [framework, setFramework] = useState<"react" | "nextjs">("nextjs");
  const [nextjsMode, setNextjsMode] = useState<"client" | "fullstack">("client");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const activeAiPrompt = framework === "nextjs" ? NEXTJS_AI_AGENT_PROMPT : REACT_AI_AGENT_PROMPT;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="flex-1 min-h-screen bg-[var(--background)] flex flex-col">
      <Header title="Integration & Setup Guides" />

      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* Framework Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 shadow-md">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Select Your Web Application Framework
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <button
                onClick={() => {
                  setFramework("nextjs");
                  setActiveTab("overview");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                  framework === "nextjs"
                    ? "bg-blue-600 text-white ring-2 ring-blue-500/50"
                    : "bg-slate-700/60 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Next.js</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-200">
                  App Router
                </span>
              </button>

              <button
                onClick={() => {
                  setFramework("react");
                  setActiveTab("overview");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                  framework === "react"
                    ? "bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/50"
                    : "bg-slate-700/60 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Atom className="w-4 h-4" />
                <span>Pure React</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/40 text-cyan-200">
                  Vite / CRA
                </span>
              </button>
            </div>
          </div>

          <Link
            href="/apps"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition border border-slate-600"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Manage App API Keys</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* HERO SECTION */}
        {framework === "nextjs" ? (
          <div className="relative rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/20 border border-blue-500/20 p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                  <Code2 className="w-3.5 h-3.5" /> Next.js 13 / 14 / 15 Integration
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  Integrate Next.js with Central Payment Hub
                </h2>
                <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                  Choose your preferred architecture below: Connect using <strong>only 2 public environment variables</strong> (Client-Only like React), or use <strong>Full-Stack with Server Routes & Webhooks</strong>.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="bg-slate-900/90 p-1.5 rounded-xl border border-slate-700 flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setNextjsMode("client");
                    setActiveTab("overview");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    nextjsMode === "client"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  ⚡ Client-Only (2 Variables)
                </button>
                <button
                  onClick={() => {
                    setNextjsMode("fullstack");
                    setActiveTab("overview");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    nextjsMode === "fullstack"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🛡️ Full-Stack (Server & Webhooks)
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-blue-950/40 border border-cyan-500/30 p-6 shadow-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
              <Atom className="w-3.5 h-3.5" /> Pure React Frontend • Vite / CRA / SPA
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Connect Pure React Frontend (Zero Backend Required)
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              This Central Payment Hub features <strong>built-in CORS</strong> and a <strong>public Client ID</strong> mode. Your React single-page application (SPA) creates orders, launches the Cashfree drop-in modal, and verifies payment status directly from the browser without needing a backend server or database!
            </p>
          </div>
        )}

        {/* AI AGENT ONE-SHOT BANNER */}
        <div className="relative rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/60 border border-purple-500/30 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  {framework === "nextjs" ? "Next.js AI Auto-Integration Prompt" : "React AI Auto-Integration Prompt"}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Sparkles className="w-2.5 h-2.5 text-purple-300" /> Cursor / Antigravity / Copilot
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Copy this complete prompt into your AI coding assistant (Cursor, Antigravity, Claude Code, Copilot). It automatically creates the hook, checkout button, installs dependencies, and configures {framework === "nextjs" ? ".env.local (Next.js)" : ".env (React/Vite)"} in one shot without asking questions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => copyText(activeAiPrompt, "ai-banner-prompt")}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-purple-900/30"
            >
              {copiedSnippet === "ai-banner-prompt" ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Prompt Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy {framework === "nextjs" ? "Next.js" : "React"} Prompt</span>
                </>
              )}
            </button>
            <button
              onClick={() => setActiveTab("ai-prompt")}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
                activeTab === "ai-prompt"
                  ? "bg-slate-800 border-purple-500/50 text-purple-300"
                  : "bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              View Instructions
            </button>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {framework === "nextjs" && nextjsMode === "client" && (
            <>
              {[
                { id: "overview", label: "Overview & Flow" },
                { id: "ai-prompt", label: "🤖 AI One-Shot Prompt" },
                { id: "env", label: "1. Next.js .env.local (2 Variables)" },
                { id: "hook", label: "2. React Payment Hook" },
                { id: "component", label: "3. Client Checkout Component" },
                { id: "testing", label: "4. Sandbox Simulator & Testing" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </>
          )}

          {framework === "nextjs" && nextjsMode === "fullstack" && (
            <>
              {[
                { id: "overview", label: "Overview & Flow" },
                { id: "ai-prompt", label: "🤖 AI One-Shot Prompt" },
                { id: "env", label: "1. Next.js Environment (5 Variables)" },
                { id: "backend", label: "2. Server Order API" },
                { id: "frontend", label: "3. Checkout Modal" },
                { id: "webhook", label: "4. Webhook Listener" },
                { id: "testing", label: "5. Sandbox Simulator & Testing" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </>
          )}

          {framework === "react" && (
            <>
              {[
                { id: "overview", label: "Overview & Architecture" },
                { id: "ai-prompt", label: "🤖 AI One-Shot Prompt" },
                { id: "env", label: "1. React Environment (.env)" },
                { id: "hook", label: "2. React Payment Hook" },
                { id: "component", label: "3. React Checkout Component" },
                { id: "testing", label: "4. Sandbox Simulator & Testing" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                      : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* NEXT.JS (CLIENT-ONLY MODE - 2 VARIABLES) */}
        {/* ========================================================================= */}
        {framework === "nextjs" && nextjsMode === "client" && (
          <div className="space-y-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-slate-200 text-xs">
                  <span className="font-bold text-blue-400">Yes! You can connect Next.js using only 2 variables:</span> Because this Central Payment Hub has <strong>built-in CORS</strong> and a public Client ID mode, your Next.js Client Components (<code>&quot;use client&quot;</code>) can call the Payment Hub directly from the user&apos;s browser without needing any Next.js backend API routes, server secrets, or webhooks.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <h4 className="font-semibold text-slate-100 text-sm">Direct Browser Call</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Your Next.js client component calls <code className="text-blue-400">POST /api/v1/orders</code> with just <code className="text-blue-400">NEXT_PUBLIC_PAYMENT_HUB_CLIENT_ID</code>.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <h4 className="font-semibold text-slate-100 text-sm">Cashfree Drop-in Modal</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      The Cashfree JS SDK mounts a checkout modal directly on top of your Next.js page.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <h4 className="font-semibold text-slate-100 text-sm">Instant Polling</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Your client component polls <code className="text-emerald-400">GET /api/v1/orders/:id/status</code> to confirm payment and display a receipt.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    Install Cashfree JS SDK
                  </h3>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800">
                    <code>npm install @cashfreepayments/cashfree-js</code>
                    <button
                      onClick={() => copyText("npm install @cashfreepayments/cashfree-js", "next-pkg-client")}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans flex items-center gap-1 transition"
                    >
                      {copiedSnippet === "next-pkg-client" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedSnippet === "next-pkg-client" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "env" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
                  <strong>Notice the NEXT_PUBLIC_ prefix:</strong> In Next.js, variables used directly inside client-side components (like buttons or hooks) must start with <code>NEXT_PUBLIC_</code>.
                </div>

                <CodeBlock
                  title="Next.js Client-Only Environment (Only 2 Variables)"
                  filePath=".env.local"
                  code={`# -------------------------------------------------------------
# Next.js Client-Only Mode (Zero-Backend, No Webhooks, No Secrets)
# -------------------------------------------------------------

# Base URL of Central Payment Hub
NEXT_PUBLIC_PAYMENT_HUB_URL="http://localhost:3000/api/v1"

# Public Client ID from Payment Hub > Applications (/apps)
NEXT_PUBLIC_PAYMENT_HUB_CLIENT_ID="pub_live_your_app_id"`}
                />
              </div>
            )}

            {activeTab === "hook" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Save this hook in your Next.js project. It calls the Central Payment Hub directly from the browser:
                </p>

                <CodeBlock
                  title="Next.js Client Payment Hook"
                  filePath="hooks/usePaymentHub.ts"
                  code={`"use client";

import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

export interface InitiatePaymentParams {
  orderId?: string;
  amount: number;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  orderNote?: string;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

export function usePaymentHub() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async ({
    orderId = \`ORD_\${Date.now()}_\${Math.floor(Math.random() * 1000)}\`,
    amount,
    customerPhone,
    customerName = "Valued Customer",
    customerEmail = "customer@example.com",
    orderNote = "Next.js Web Store Order",
    onSuccess,
    onFailure,
  }: InitiatePaymentParams) => {
    setLoading(true);
    setError(null);

    const hubUrl = process.env.NEXT_PUBLIC_PAYMENT_HUB_URL || "http://localhost:3000/api/v1";
    const clientId = process.env.NEXT_PUBLIC_PAYMENT_HUB_CLIENT_ID || "";

    try {
      // 1. Direct browser call to Central Payment Hub (CORS is enabled)
      const res = await fetch(\`\${hubUrl}/orders\`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": clientId,
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: Number(amount),
          order_currency: "INR",
          customer_details: {
            customer_id: \`CUST_\${customerPhone}\`,
            customer_phone: customerPhone,
            customer_name: customerName,
            customer_email: customerEmail,
          },
          order_note: orderNote,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.payment_session_id) {
        throw new Error(data.error || "Failed to create payment session");
      }

      // 2. Load Cashfree Checkout SDK
      const cashfree = await load({
        mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      });

      // 3. Mount Drop-in Modal
      const result = await cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_modal",
      });

      if (result.error) {
        const errMsg = result.error.message || "Payment cancelled";
        setError(errMsg);
        onFailure?.(errMsg);
        return;
      }

      // 4. Poll status for immediate UI receipt
      pollStatus(orderId, hubUrl, clientId, onSuccess, onFailure);
    } catch (err: any) {
      const errMsg = err.message || "Network error launching payment";
      setError(errMsg);
      onFailure?.(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = (
    orderId: string,
    hubUrl: string,
    clientId: string,
    onSuccess?: (paymentId: string) => void,
    onFailure?: (err: string) => void
  ) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(\`\${hubUrl}/orders/\${orderId}/status\`, {
          headers: { "x-client-id": clientId },
        });
        const statusData = await res.json();

        if (statusData.status === "PAID") {
          clearInterval(interval);
          onSuccess?.(statusData.latest_payment?.cfPaymentId || "CONFIRMED");
        } else if (attempts >= 6) {
          clearInterval(interval);
          onSuccess?.("PENDING_VERIFICATION");
        }
      } catch {
        clearInterval(interval);
        onFailure?.("Failed to check status");
      }
    }, 1500);
  };

  return { pay, loading, error };
}`}
                />
              </div>
            )}

            {activeTab === "component" && (
              <div className="space-y-4">
                <CodeBlock
                  title="Next.js Client Component"
                  filePath="components/CheckoutButton.tsx"
                  code={`"use client";

import React, { useState } from "react";
import { usePaymentHub } from "@/hooks/usePaymentHub";

export function CheckoutButton({ amount }: { amount: number }) {
  const { pay, loading, error } = usePaymentHub();
  const [receipt, setReceipt] = useState<string | null>(null);

  const handleCheckout = () => {
    setReceipt(null);
    pay({
      amount,
      customerPhone: "9876543210",
      customerName: "Priya Patel",
      customerEmail: "priya@example.com",
      orderNote: "Client-only Next.js Order",
      onSuccess: (paymentId) => {
        setReceipt(\`🎉 Payment Confirmed! Ref ID: \${paymentId}\`);
      },
      onFailure: (err) => {
        console.warn("Payment checkout notice:", err);
      },
    });
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition shadow-md"
      >
        {loading ? "Opening Cashfree..." : \`Pay ₹\${amount} with Cashfree\`}
      </button>

      {receipt && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          {receipt}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          ❌ {error}
        </div>
      )}
    </div>
  );
}`}
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* NEXT.JS (FULL-STACK MODE - 5 VARIABLES) */}
        {/* ========================================================================= */}
        {framework === "nextjs" && nextjsMode === "fullstack" && (
          <div className="space-y-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <h4 className="font-semibold text-slate-100 text-sm">Create Order</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Your Next.js Route Handler calls <code className="text-blue-400">POST /api/v1/orders</code> with your Client ID & Secret to receive a <code className="text-blue-400">payment_session_id</code>.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <h4 className="font-semibold text-slate-100 text-sm">Mount Modal</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Your React client component mounts the official <code className="text-indigo-400">@cashfreepayments/cashfree-js</code> drop-in modal.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <h4 className="font-semibold text-slate-100 text-sm">Verified Webhook</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      The Payment Hub locks the terminal <code className="text-emerald-400">PAID</code> state and delivers an HMAC-SHA256 signed event to your Next.js webhook.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "env" && (
              <div className="space-y-4">
                <CodeBlock
                  title="Next.js Full-Stack Environment (5 Variables)"
                  filePath=".env.local"
                  code={`# -------------------------------------------------------------
# Next.js Full-Stack Mode (Server Routes + Signed Webhooks)
# -------------------------------------------------------------

PAYMENT_HUB_URL="http://localhost:3000/api/v1"
PAYMENT_HUB_CLIENT_ID="pub_live_your_app_id"
PAYMENT_HUB_CLIENT_SECRET="sec_live_your_app_secret"
PAYMENT_HUB_WEBHOOK_SECRET="whsec_your_webhook_secret"
NEXT_PUBLIC_APP_URL="http://localhost:3001"`}
                />
              </div>
            )}

            {activeTab === "backend" && (
              <div className="space-y-4">
                <CodeBlock
                  title="Next.js App Router Order Route Handler"
                  filePath="app/api/checkout/route.ts"
                  code={`import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { amount, customerName, customerPhone, customerEmail, orderNote } = await req.json();

    const hubUrl = process.env.PAYMENT_HUB_URL || "http://localhost:3000/api/v1";
    const clientId = process.env.PAYMENT_HUB_CLIENT_ID!;
    const clientSecret = process.env.PAYMENT_HUB_CLIENT_SECRET!;

    const internalOrderId = \`ORD_\${Date.now()}_\${Math.floor(Math.random() * 1000)}\`;

    const hubRes = await fetch(\`\${hubUrl}/orders\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
      body: JSON.stringify({
        order_id: internalOrderId,
        order_amount: Number(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: \`CUST_\${customerPhone}\`,
          customer_phone: customerPhone,
          customer_name: customerName || "Guest Customer",
          customer_email: customerEmail || "customer@example.com",
        },
        order_note: orderNote || "Next.js Web Store Purchase",
        order_meta: {
          return_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?order_id=\${internalOrderId}\`,
        },
      }),
    });

    const data = await hubRes.json();

    if (!data.success || !data.payment_session_id) {
      return NextResponse.json(
        { success: false, error: data.error || "Failed to create payment session" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      payment_session_id: data.payment_session_id,
      order_id: internalOrderId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}`}
                />
              </div>
            )}

            {activeTab === "frontend" && (
              <div className="space-y-4">
                <CodeBlock
                  title="Next.js Client Checkout Button"
                  filePath="components/CheckoutButton.tsx"
                  code={`"use client";

import React, { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

export function CheckoutButton({ amount, customerPhone }: { amount: number; customerPhone: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, customerPhone }),
      });

      const orderData = await response.json();
      if (!orderData.success || !orderData.payment_session_id) {
        throw new Error(orderData.error || "Could not initialize order");
      }

      const cashfree = await load({
        mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      });

      const checkoutResult = await cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_modal",
      });

      if (checkoutResult.error) {
        setResult(\`❌ Payment cancelled: \${checkoutResult.error.message}\`);
        return;
      }

      setResult("🎉 Payment Completed! Verifying status...");
    } catch (err: any) {
      setResult(\`❌ Error: \${err.message}\`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
    >
      {loading ? "Launching..." : \`Pay ₹\${amount}\`}
    </button>
  );
}`}
                />
              </div>
            )}

            {activeTab === "webhook" && (
              <div className="space-y-4">
                <CodeBlock
                  title="Next.js Webhook Route Handler"
                  filePath="app/api/webhooks/payment/route.ts"
                  code={`import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature");
    const webhookSecret = process.env.PAYMENT_HUB_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { payload } = JSON.parse(rawBody);

    if (payload.event_type === "PAYMENT.SUCCESS") {
      console.log(\`✅ Order \${payload.order_id} marked PAID for ₹\${payload.amount}\`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}`}
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PURE REACT (VITE / CRA) */}
        {/* ========================================================================= */}
        {framework === "react" && (
          <div className="space-y-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <h4 className="font-semibold text-slate-100 text-sm">Direct Browser Call</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Your React app calls <code className="text-cyan-400">POST /api/v1/orders</code> directly with just your Public <code className="text-cyan-400">x-client-id</code> header. No backend needed!
                    </p>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <h4 className="font-semibold text-slate-100 text-sm">Cashfree Drop-in Modal</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      The official Cashfree JS library mounts a checkout popup over your React page. Homebuyers pay via UPI, Card, or NetBanking without page redirection.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <h4 className="font-semibold text-slate-100 text-sm">Instant Status Polling</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Once the customer completes the payment, the React hook polls <code className="text-emerald-400">GET /api/v1/orders/:id/status</code> to show a success confirmation receipt.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "env" && (
              <div className="space-y-4">
                <CodeBlock
                  title="Vite React Environment File"
                  filePath=".env"
                  code={`# -------------------------------------------------------------
# Pure React Frontend (Vite)
# -------------------------------------------------------------

VITE_PAYMENT_HUB_URL="http://localhost:3000/api/v1"
VITE_PAYMENT_HUB_CLIENT_ID="pub_live_your_app_id_here"`}
                />
              </div>
            )}

            {activeTab === "hook" && (
              <div className="space-y-4">
                <CodeBlock
                  title="Universal React Payment Hook"
                  filePath="src/hooks/usePaymentHub.ts"
                  code={`import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

export interface InitiatePaymentParams {
  orderId?: string;
  amount: number;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  orderNote?: string;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

export function usePaymentHub() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async ({
    orderId = \`ORD_\${Date.now()}_\${Math.floor(Math.random() * 1000)}\`,
    amount,
    customerPhone,
    customerName = "Valued Customer",
    customerEmail = "customer@example.com",
    orderNote = "React Store Checkout",
    onSuccess,
    onFailure,
  }: InitiatePaymentParams) => {
    setLoading(true);
    setError(null);

    const hubUrl =
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_PAYMENT_HUB_URL) ||
      process.env.REACT_APP_PAYMENT_HUB_URL ||
      "http://localhost:3000/api/v1";

    const clientId =
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_PAYMENT_HUB_CLIENT_ID) ||
      process.env.REACT_APP_PAYMENT_HUB_CLIENT_ID ||
      "";

    try {
      const res = await fetch(\`\${hubUrl}/orders\`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": clientId,
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: Number(amount),
          order_currency: "INR",
          customer_details: {
            customer_id: \`CUST_\${customerPhone}\`,
            customer_phone: customerPhone,
            customer_name: customerName,
            customer_email: customerEmail,
          },
          order_note: orderNote,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.payment_session_id) {
        throw new Error(data.error || "Failed to create payment session");
      }

      const cashfree = await load({
        mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      });

      const result = await cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_modal",
      });

      if (result.error) {
        const errMsg = result.error.message || "Payment cancelled";
        setError(errMsg);
        onFailure?.(errMsg);
        return;
      }

      pollStatus(orderId, hubUrl, clientId, onSuccess, onFailure);
    } catch (err: any) {
      const errMsg = err.message || "Network error launching payment";
      setError(errMsg);
      onFailure?.(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = (
    orderId: string,
    hubUrl: string,
    clientId: string,
    onSuccess?: (paymentId: string) => void,
    onFailure?: (err: string) => void
  ) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(\`\${hubUrl}/orders/\${orderId}/status\`, {
          headers: { "x-client-id": clientId },
        });
        const statusData = await res.json();

        if (statusData.status === "PAID") {
          clearInterval(interval);
          onSuccess?.(statusData.latest_payment?.cfPaymentId || "CONFIRMED");
        } else if (attempts >= 6) {
          clearInterval(interval);
          onSuccess?.("PENDING_VERIFICATION");
        }
      } catch {
        clearInterval(interval);
        onFailure?.("Failed to check status");
      }
    }, 1500);
  };

  return { pay, loading, error };
}`}
                />
              </div>
            )}

            {activeTab === "component" && (
              <div className="space-y-4">
                <CodeBlock
                  title="React Checkout Component"
                  filePath="src/components/CheckoutPage.tsx"
                  code={`import React, { useState } from "react";
import { usePaymentHub } from "../hooks/usePaymentHub";

export function CheckoutPage() {
  const { pay, loading, error } = usePaymentHub();
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const handlePay = () => {
    setPaymentSuccess(null);

    pay({
      amount: 499.00,
      customerPhone: "9876543210",
      customerName: "Aarav Sharma",
      customerEmail: "aarav@example.com",
      orderNote: "Premium React Subscription",
      onSuccess: (paymentId) => {
        setPaymentSuccess(\`🎉 Payment Confirmed! Transaction ID: \${paymentId}\`);
      },
      onFailure: (err) => {
        console.error("Payment failed or cancelled:", err);
      },
    });
  };

  return (
    <div style={{ maxWidth: "450px", margin: "40px auto", padding: "20px", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
      <h2>Order Summary</h2>
      <p style={{ color: "#64748b" }}>Annual Pro Membership</p>
      <h3 style={{ fontSize: "1.8rem", margin: "16px 0" }}>₹499.00</h3>

      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px",
          backgroundColor: "#06b6d4",
          color: "#0f172a",
          fontWeight: "bold",
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "1rem",
        }}
      >
        {loading ? "Opening Cashfree..." : "Pay ₹499 with Cashfree"}
      </button>

      {paymentSuccess && (
        <div style={{ marginTop: "16px", padding: "12px", background: "#ecfdf5", color: "#065f46", borderRadius: "8px" }}>
          {paymentSuccess}
        </div>
      )}

      {error && (
        <div style={{ marginTop: "16px", padding: "12px", background: "#fef2f2", color: "#991b1b", borderRadius: "8px" }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}`}
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* AI ONE-SHOT AGENT PROMPT */}
        {/* ========================================================================= */}
        {activeTab === "ai-prompt" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-slate-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="font-bold text-purple-400">🤖 Hands-Free AI Integration Prompt:</span>
                <p className="text-slate-300">
                  Paste this exact prompt into your AI coding tool (Cursor Composer, Antigravity, Claude Code, GitHub Copilot Chat). The AI agent will automatically install <code>@cashfreepayments/cashfree-js</code>, create <code>hooks/usePaymentHub.ts</code>, create <code>components/CheckoutButton.tsx</code>, and wire the checkout without asking unwanted questions.
                </p>
              </div>
              <button
                onClick={() => copyText(activeAiPrompt, "ai-tab-prompt")}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                {copiedSnippet === "ai-tab-prompt" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy {framework === "nextjs" ? "Next.js" : "React"} Prompt</span>
                  </>
                )}
              </button>
            </div>

            <CodeBlock
              title={
                framework === "nextjs"
                  ? "Next.js AI Agent One-Shot Prompt (Copy & Paste)"
                  : "Pure React AI Agent One-Shot Prompt (Copy & Paste)"
              }
              filePath={framework === "nextjs" ? "NEXTJS-AI-AGENT-PROMPT.md" : "REACT-AI-AGENT-PROMPT.md"}
              code={activeAiPrompt}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* COMMON TESTING & SANDBOX CREDENTIALS */}
        {/* ========================================================================= */}
        {activeTab === "testing" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-slate-200 text-xs">
              <span className="font-bold text-blue-400">Cashfree Sandbox Ready:</span> Use these official test credentials inside the modal popup to test payments.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Test UPI (Fastest)</h4>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Instant
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-emerald-400">
                    <span>success@upi</span>
                    <button
                      onClick={() => copyText("success@upi", "upi-success")}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans flex items-center gap-1"
                    >
                      {copiedSnippet === "upi-success" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedSnippet === "upi-success" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-rose-400">
                    <span>failure@upi</span>
                    <button
                      onClick={() => copyText("failure@upi", "upi-failure")}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans flex items-center gap-1"
                    >
                      {copiedSnippet === "upi-failure" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedSnippet === "upi-failure" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-bold text-white">Test Cards</h4>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Simulator
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-slate-300">
                    <span>Visa: 4012 0010 3000 0004</span>
                    <button
                      onClick={() => copyText("4012001030000004", "card-visa")}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-sans flex items-center gap-1"
                    >
                      {copiedSnippet === "card-visa" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedSnippet === "card-visa" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-slate-300">
                    <span>MC: 5123 4500 0000 0008</span>
                    <button
                      onClick={() => copyText("5123450000000008", "card-mc")}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-sans flex items-center gap-1"
                    >
                      {copiedSnippet === "card-mc" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedSnippet === "card-mc" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-4 pt-1">
                    <span>Expiry: <strong className="text-slate-200">12/28</strong></span>
                    <span>CVV: <strong className="text-slate-200">123</strong></span>
                    <span>OTP: <strong className="text-slate-200">123456</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
