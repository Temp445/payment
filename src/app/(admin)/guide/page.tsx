"use client";

import React, { useState, useMemo } from "react";
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
  Search,
  ExternalLink,
  Database,
  ChevronRight,
  ChevronDown,
  Globe,
  Lock,
  Cpu,
  BookOpen,
  Sliders,
  Webhook,
  Activity,
  CheckSquare,
  HelpCircle,
  Key,
  Shield,
  Clock,
  RefreshCw,
  Send,
} from "lucide-react";
import Link from "next/link";

interface CodeBlockProps {
  title: string;
  language?: string;
  code: string;
  filePath?: string;
}

function CodeBlock({ title, code, filePath, language = "typescript" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/90 overflow-hidden shadow-xl mb-5">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-slate-200">{title}</span>
          {filePath && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {filePath}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium border border-slate-700/60"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto font-mono text-xs text-slate-300 leading-relaxed bg-[#0b0f19]">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

// ============================================================================
// PROMPT & SNIPPET CONSTANTS
// ============================================================================

const REACT_AI_AGENT_PROMPT = `You are an expert React / Vite frontend developer. Integrate Central Payment Hub checkout and licensing into this React application by following these instructions step-by-step:

### Step 1: Install Cashfree Web SDK
Run in terminal:
npm install @cashfreepayments/cashfree-js

### Step 2: Configure Environment Variables
Add to your ".env" file:
VITE_PAYMENT_HUB_URL="http://localhost:3001/api/v1"
VITE_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"

### Step 3: Create Hook (src/hooks/usePaymentHub.ts)
Create "src/hooks/usePaymentHub.ts" with Cashfree dropin modal support, payment polling, and error handling.

### Step 4: Add <CheckoutButton />
Create "src/components/CheckoutButton.tsx" to trigger payments effortlessly without backend servers.`;

const NEXTJS_AI_AGENT_PROMPT = `You are an expert Next.js developer. Integrate Central Payment Hub checkout into this Next.js application by following these instructions step-by-step:

### Step 1: Install Cashfree SDK
npm install @cashfreepayments/cashfree-js

### Step 2: Configure Environment Variables (.env.local)
NEXT_PUBLIC_PAYMENT_HUB_URL="http://localhost:3001/api/v1"
NEXT_PUBLIC_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"

### Step 3: Create Hook (hooks/usePaymentHub.ts)
"use client";
import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";
// Handles payment initiation, Cashfree drop-in popup, and status polling.`;

const CLIENT_SDK_CODE = `/**
 * Universal Payment Hub Client SDK (paymentHubClient.ts)
 * Plug-and-play for Pure React, Next.js, Vue, or Vanilla JS.
 */
import { load } from "@cashfreepayments/cashfree-js";

export interface HubConfig {
  hubUrl: string;       // e.g. "http://localhost:3001/api/v1"
  clientId: string;     // e.g. "pub_live_payroll_..."
}

export class PaymentHubClient {
  private hubUrl: string;
  private clientId: string;

  constructor(config: HubConfig) {
    this.hubUrl = config.hubUrl.replace(/\\/$/, "");
    this.clientId = config.clientId;
  }

  // 1. Check Active License & Feature Entitlements
  async checkSubscription(orgId: string, feature?: string) {
    const url = new URL(\`\${this.hubUrl}/subscriptions/check\`);
    url.searchParams.set("orgId", orgId);
    if (feature) url.searchParams.set("feature", feature);

    const res = await fetch(url.toString(), {
      headers: { "x-client-id": this.clientId }
    });
    return res.json();
  }

  // 2. Fetch Configured Subscription Plans & Tiers
  async getPlans() {
    const res = await fetch(\`\${this.hubUrl}/subscriptions/offers\`, {
      headers: { "x-client-id": this.clientId }
    });
    return res.json();
  }

  // 3. Initiate Cashfree Drop-in Checkout
  async checkout(params: {
    amount: number;
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
    orderNote?: string;
    metadata?: Record<string, any>;
    onSuccess?: (paymentId: string) => void;
    onFailure?: (error: string) => void;
  }) {
    // A. Create Order
    const orderRes = await fetch(\`\${this.hubUrl}/orders\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": this.clientId
      },
      body: JSON.stringify({
        amount: params.amount,
        customerPhone: params.customerPhone,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
        orderNote: params.orderNote,
        metadata: params.metadata || {}
      })
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.payment_session_id) {
      throw new Error(orderData.error || "Order creation failed");
    }

    // B. Launch Cashfree Drop-in
    const cashfree = await load({ mode: "sandbox" });
    const result = await cashfree.checkout({
      paymentSessionId: orderData.payment_session_id,
      redirectTarget: "_modal"
    });

    if (result.error) {
      if (params.onFailure) params.onFailure(result.error.message || "Payment aborted");
      return;
    }

    if (params.onSuccess) params.onSuccess(orderData.order_id);
  }
}`;

const PG_SYNC_DDL = `-- ============================================================================
-- Standard Tenant App Database Schema (PostgreSQL / Supabase)
-- Run this script in your application's database (e.g. Ace Payroll, CRM, ERP).
-- ============================================================================

-- 1. App Subscriptions Table (Stores active entitlement licenses)
CREATE TABLE IF NOT EXISTS public.app_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL,
    user_id TEXT,
    tier TEXT NOT NULL DEFAULT 'FREE',
    tier_level INTEGER NOT NULL DEFAULT 0,
    offer_starts_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    offer_ends_on TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    user_limit INTEGER NOT NULL DEFAULT 5,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_subs_org ON public.app_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_app_subs_active ON public.app_subscriptions(is_active, offer_ends_on);

-- 2. App Payment Transactions Ledger (Audit of all paid orders)
CREATE TABLE IF NOT EXISTS public.app_payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT UNIQUE NOT NULL,
    cf_payment_id TEXT,
    organization_id TEXT NOT NULL,
    user_id TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    tier TEXT NOT NULL,
    billing_period INTEGER NOT NULL DEFAULT 1,
    period_type VARCHAR(20) NOT NULL DEFAULT 'month',
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'PAID',
    raw_payload JSONB,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_tx_order ON public.app_payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_app_tx_org ON public.app_payment_transactions(organization_id);

-- 3. Automated License Provisioning Trigger
CREATE OR REPLACE FUNCTION public.handle_tenant_subscription_activation()
RETURNS TRIGGER AS $$
DECLARE
    v_ends_on TIMESTAMPTZ;
BEGIN
    IF NEW.period_type = 'year' THEN
        v_ends_on := NEW.paid_at + (NEW.billing_period || ' years')::INTERVAL;
    ELSE
        v_ends_on := NEW.paid_at + (NEW.billing_period || ' months')::INTERVAL;
    END IF;

    -- Upsert active subscription license for the organization
    INSERT INTO public.app_subscriptions (
        organization_id, user_id, tier, tier_level,
        offer_starts_on, offer_ends_on, is_active, features, updated_at
    )
    VALUES (
        NEW.organization_id, NEW.user_id, NEW.tier, 1,
        NEW.paid_at, v_ends_on, TRUE, NEW.features, NOW()
    )
    ON CONFLICT (organization_id) DO UPDATE SET
        tier = EXCLUDED.tier,
        offer_starts_on = EXCLUDED.offer_starts_on,
        offer_ends_on = EXCLUDED.offer_ends_on,
        is_active = TRUE,
        features = EXCLUDED.features,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activate_tenant_license ON public.app_payment_transactions;
CREATE TRIGGER trg_activate_tenant_license
AFTER INSERT ON public.app_payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_tenant_subscription_activation();`;

const MYSQL_SYNC_DDL = `-- ============================================================================
-- Standard Tenant App Database Schema (MySQL 8.0+)
-- Run this in your MySQL database (e.g. for PHP, Laravel, or Node/Express apps).
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NULL,
    tier VARCHAR(50) NOT NULL DEFAULT 'FREE',
    tier_level INT NOT NULL DEFAULT 0,
    offer_starts_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    offer_ends_on DATETIME NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    user_limit INT NOT NULL DEFAULT 5,
    features JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_org (organization_id),
    KEY idx_active_ends (is_active, offer_ends_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_payment_transactions (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    cf_payment_id VARCHAR(100) NULL,
    organization_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    tier VARCHAR(50) NOT NULL,
    billing_period INT NOT NULL DEFAULT 1,
    period_type VARCHAR(20) NOT NULL DEFAULT 'month',
    features JSON NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PAID',
    raw_payload JSON NULL,
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

const EDGE_WORKER_CODE = `/**
 * Edge Webhook Receiver (Cloudflare Workers / Supabase Edge / Node.js)
 * Receives signed PAYMENT.SUCCESS event from Payment Hub Outbox and inserts into database.
 */
import crypto from "crypto";

export async function handlePaymentWebhook(req: Request, env: any) {
  const signature = req.headers.get("x-webhook-signature");
  const timestamp = req.headers.get("x-webhook-timestamp");
  const rawBody = await req.text();

  // 1. Verify HMAC-SHA256 Signature
  const expectedSignature = crypto
    .createHmac("sha256", env.PAYMENT_HUB_WEBHOOK_SECRET)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex");

  if (signature !== expectedSignature) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const { event, data } = payload;

  if (event === "PAYMENT.SUCCESS") {
    // 2. Insert into app_payment_transactions
    // The PostgreSQL trigger will automatically activate the app_subscriptions license!
    await db.query(\`
      INSERT INTO app_payment_transactions (
        order_id, cf_payment_id, organization_id, user_id,
        amount, currency, tier, billing_period, period_type, features, raw_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (order_id) DO NOTHING
    \`, [
      data.orderId,
      data.paymentId,
      data.metadata?.organizationId || "DEFAULT_ORG",
      data.metadata?.userId || null,
      data.amount,
      data.currency || "INR",
      data.metadata?.tier || "Professional",
      data.metadata?.billingPeriod || 1,
      data.metadata?.periodType || "month",
      JSON.stringify(data.metadata?.features || []),
      JSON.stringify(payload)
    ]);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}`;

// ============================================================================
// SIDEBAR NAVIGATION CATEGORIES (ZOHO PAYMENTS STYLE)
// ============================================================================

interface NavItem {
  id: string;
  title: string;
  badge?: string;
}

interface NavCategory {
  title: string;
  icon: any;
  items: NavItem[];
}


const SUPABASE_EDGE_FUNCTION_CODE = `/**
 * Supabase Edge Function: payment-hub-webhook
 * Receives signed webhooks from Central Payment Hub and inserts into app_payment_transactions.
 * File location: supabase/functions/payment-hub-webhook/index.ts
 *
 * Deploy with:
 * supabase functions deploy payment-hub-webhook --no-verify-jwt
 * supabase secrets set PAYMENT_HUB_WEBHOOK_SECRET="your_webhook_secret_here"
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

serve(async (req) => {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature");
    const secret = Deno.env.get("PAYMENT_HUB_WEBHOOK_SECRET");

    if (!secret) {
      console.error("Missing PAYMENT_HUB_WEBHOOK_SECRET environment secret");
      return new Response(JSON.stringify({ error: "Missing webhook secret" }), { status: 500 });
    }

    // 1. Verify HMAC-SHA256 signature from Central Payment Hub
    const expectedSig = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (signature !== expectedSig) {
      console.error("Invalid signature detected");
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // 2. Process PAYMENT.SUCCESS events
    if (payload.event_type === "PAYMENT.SUCCESS") {
      // Connect to Supabase using the service_role key (bypasses RLS for system inserts)
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // 3. Insert into the payment audit ledger
      // The Postgres trigger 'trg_activate_tenant_license' will automatically activate the license!
      const { error } = await supabase.from("app_payment_transactions").insert({
        order_id: payload.order_id,
        cf_payment_id: payload.payment_id,
        organization_id: payload.metadata?.organization_id || "DEFAULT_ORG",
        user_id: payload.metadata?.user_id || null,
        amount: payload.amount,
        currency: payload.currency || "INR",
        tier: payload.metadata?.tier || "PRO",
        billing_period: Number(payload.metadata?.billing_period || 1),
        period_type: payload.metadata?.period_type || "month",
        features: payload.metadata?.features || [],
        status: "PAID",
        raw_payload: payload,
      });

      if (error) {
        console.error("Supabase insertion error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Edge function unhandled error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});`;

const SUPABASE_REALTIME_HOOK_CODE = `/**
 * React Realtime Subscription Hook
 * File location: src/hooks/useSubscription.ts
 *
 * Listens to postgres_changes on 'app_subscriptions'.
 * When Payment Hub's webhook is processed by the Edge Function,
 * the UI automatically unlocks PRO features in real-time with zero page refresh!
 */
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function useSubscription(organizationId: string) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;

    // 1. Initial Fetch of current organization plan
    supabase
      .from("app_subscriptions")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle()
      .then(({ data }) => {
        setSubscription(data);
        setLoading(false);
      });

    // 2. Realtime WebSocket: Updates instantly when webhook triggers license activation!
    const channel = supabase
      .channel(\`sub_\${organizationId}\`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_subscriptions",
          filter: \`organization_id=eq.\${organizationId}\`,
        },
        (payload) => {
          console.log("[Supabase Realtime] License activated/updated:", payload.new);
          setSubscription(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  return { subscription, loading };
}`;

const NEXTJS_WEBHOOK_ROUTE_CODE = `/**
 * Next.js Webhook Receiver (App Router)
 * File location: app/api/webhooks/payment-hub/route.ts
 *
 * Receives signed PAYMENT.SUCCESS events from Central Payment Hub.
 * Verifies HMAC-SHA256 signature and records into the database.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature");
    const secret = process.env.PAYMENT_HUB_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json({ error: "Missing PAYMENT_HUB_WEBHOOK_SECRET" }, { status: 500 });
    }

    // 1. Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    if (payload.event_type === "PAYMENT.SUCCESS") {
      // 2. Insert into your database (e.g., Prisma, Drizzle, or raw SQL)
      // The Postgres trigger 'trg_activate_tenant_license' will automatically activate the license!
      console.log("[Next.js Webhook] Payment verified for order:", payload.order_id);

      // Example SQL query:
      // await db.query(
      //   \`INSERT INTO app_payment_transactions (order_id, cf_payment_id, organization_id, amount, tier, billing_period, period_type)
      //    VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (order_id) DO NOTHING\`,
      //   [payload.order_id, payload.payment_id, payload.metadata.organization_id, payload.amount, payload.metadata.tier, payload.metadata.billing_period, payload.metadata.period_type]
      // );
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`;

const NEXTJS_MIDDLEWARE_CODE = `/**
 * Next.js Middleware / Route Guard
 * File location: middleware.ts
 *
 * Protects premium routes by checking license validity.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const orgId = req.cookies.get("organization_id")?.value;

  if (orgId && req.nextUrl.pathname.startsWith("/pro-feature")) {
    try {
      const res = await fetch(\`\${process.env.PAYMENT_HUB_URL}/subscriptions/check?org_id=\${orgId}\`, {
        headers: { "x-client-id": process.env.PAYMENT_HUB_CLIENT_ID! },
        cache: "no-store",
      });
      const sub = await res.json();

      if (!sub.has_active_subscription) {
        return NextResponse.redirect(new URL("/billing/upgrade", req.url));
      }
    } catch (e) {
      console.error("License check failed", e);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pro-feature/:path*"],
};`;

const NAV_CATEGORIES: NavCategory[] = [
  {
    title: "Getting Started",
    icon: BookOpen,
    items: [
      { id: "overview", title: "Overview" },
      { id: "quickstart", title: "Quickstart (6-Step Flow)", badge: "Core" },
      { id: "architecture", title: "Architecture & Matrix" },
    ],
  },
  {
    title: "Framework Guides",
    icon: Globe,
    items: [
      { id: "react-supabase", title: "React + Supabase", badge: "Full Flow" },
      { id: "nextjs", title: "Next.js App Router", badge: "Full-Stack" },
      { id: "react", title: "Pure React (Zero Backend)", badge: "Client Only" },
      { id: "universal-sdk", title: "Universal Client SDK" },
    ],
  },
  {
    title: "Database Sync & Webhooks",
    icon: Database,
    items: [
      { id: "db-sync-overview", title: "Database Sync Overview" },
      { id: "postgres-schema", title: "PostgreSQL & Supabase DDL", badge: "Trigger" },
      { id: "mysql-schema", title: "MySQL 8.0+ Schema" },
      { id: "edge-worker", title: "Edge Functions & Workers" },
    ],
  },
  {
    title: "Subscriptions & Licensing",
    icon: Sliders,
    items: [
      { id: "entitlements", title: "Entitlement Checks (/check)" },
    ],
  },
  {
    title: "APIs & Security",
    icon: Lock,
    items: [
      { id: "api-reference", title: "REST API Reference", badge: "v1" },
    ],
  },
  {
    title: "Testing & Sandbox",
    icon: Cpu,
    items: [
      { id: "sandbox-testing", title: "Cashfree Sandbox & Cards" },
    ],
  },
  {
    title: "AI Tools",
    icon: Bot,
    items: [
      { id: "ai-prompt-react", title: "React + Supabase AI Prompt" },
      { id: "ai-prompt-nextjs", title: "Next.js AI Prompt" },
    ],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [reactSubTab, setReactSubTab] = useState<"supabase" | "pure">("supabase");
  const [nextjsSubTab, setNextjsSubTab] = useState<"fullstack" | "client">("fullstack");

  const toggleCategory = (catTitle: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catTitle]: !prev[catTitle],
    }));
  };

  // Filtered Navigation based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return NAV_CATEGORIES;
    const query = searchQuery.toLowerCase();
    return NAV_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          cat.title.toLowerCase().includes(query)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="flex-1 -m-6 md:-m-8 min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans">
      {/* Top Bar matching Zoho Developer Docs style */}
      <header className="sticky top-0 z-30 h-14 bg-[#0a0f1d]/95 backdrop-blur border-b border-slate-800/80 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-blue-900/40">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">Payment Hub</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                  Developer Docs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Search Input */}
        <div className="flex-1 max-w-md mx-6">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentation, hooks, schemas, APIs..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Cashfree v2023 • Live Ready
          </span>
          <Link
            href="/apps"
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <span>Apps Registry</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ================================================================= */}
        {/* LEFT SIDEBAR NAVIGATION (Collapsible tree like Zoho Docs) */}
        {/* ================================================================= */}
        <aside className="w-64 shrink-0 bg-[#070b14] border-r border-slate-800/80 p-3 overflow-y-auto hidden md:block">
          <nav className="space-y-4">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              const isCollapsed = collapsedCategories[cat.title] || false;
              return (
                <div key={cat.title} className="space-y-1">
                  <button
                    onClick={() => toggleCategory(cat.title)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-blue-400" />
                      <span>{cat.title}</span>
                    </div>
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  {!isCollapsed && (
                    <div className="pl-3.5 space-y-0.5 border-l border-slate-800/80 ml-3">
                      {cat.items.map((item) => {
                        const isActive = activeSection === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition ${
                              isActive
                                ? "bg-blue-600/15 text-blue-400 font-semibold border-l-2 border-blue-500 -ml-[1px]"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                            }`}
                          >
                            <span className="truncate">{item.title}</span>
                            {item.badge && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  item.badge === "Popular"
                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                    : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ================================================================= */}
        {/* RIGHT MAIN CONTENT AREA */}
        {/* ================================================================= */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-5xl">
          {/* =============================================================== */}
          {/* 1. OVERVIEW PAGE (1:1 Match with Zoho Reference Image 4) */}
          {/* =============================================================== */}
          {activeSection === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Header Box */}
              <div className="space-y-3 border-b border-slate-800 pb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                      Payment Hub — Developer Documentation
                    </h1>
                    <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                      Payment Hub is a unified payment solution and multi-tenant licensing aggregator that simplifies payment collection and automated SaaS entitlements for <strong>20+ tenant applications</strong> (Payroll, Real Estate CRM, ERP, Autodialer, MVIS). It supports multiple payment methods, works seamlessly with your client apps, and ensures compliance with financial regulations, making it easier for businesses to handle their payments securely and efficiently.
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Using our APIs, webhooks, and universal client SDK, you can build a flexible and scalable payment experience. Explore our documentation to integrate Payment Hub with external applications.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => setActiveSection("ai-prompt-react")}
                      className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Copy AI Prompt</span>
                    </button>
                    <button
                      onClick={() => setActiveSection("quickstart")}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span>6-Step Quickstart</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 FEATURE CARDS GRID (Matches Reference Image 4) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* CARD 1: No-Code & Low-Code Solutions (Client-Only) */}
                <div
                  onClick={() => setActiveSection("react-supabase")}
                  className="group p-5 rounded-2xl border border-slate-800 bg-[#0d1424] hover:border-blue-500/50 hover:bg-[#111a30] transition cursor-pointer shadow-lg space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Visual Card Wireframe Mockup */}
                    <div className="h-28 rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex flex-col justify-between group-hover:border-slate-700 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                          Client Drop-in Modal
                        </span>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-slate-700" />
                          <div className="w-2 h-2 rounded-full bg-slate-700" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-3 w-2/3 rounded bg-slate-800" />
                        <div className="h-2 w-1/2 rounded bg-slate-800/60" />
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-[10px] text-slate-400">Zero Backend Required</span>
                        <div className="px-2 py-0.5 rounded bg-blue-600 text-[10px] text-white font-bold">
                          Pay ₹5,000
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition flex items-center justify-between">
                        <span>No-Code & Low-Code Solutions</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Accept payments and check licenses instantly in Pure React / Vite SPAs with client-side drop-in modals, payment links, and zero-backend integration.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                    Explore React + Supabase Guide <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* CARD 2: Web Integration */}
                <div
                  onClick={() => setActiveSection("nextjs")}
                  className="group p-5 rounded-2xl border border-slate-800 bg-[#0d1424] hover:border-indigo-500/50 hover:bg-[#111a30] transition cursor-pointer shadow-lg space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Visual Card Wireframe Mockup */}
                    <div className="h-28 rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex flex-col justify-between group-hover:border-slate-700 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                          Web Integration
                        </span>
                        <Code2 className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="space-y-1.5 font-mono text-[10px] text-slate-400 bg-slate-950 p-1.5 rounded">
                        <div>const &#123; pay &#125; = usePaymentHub();</div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-[10px] text-slate-400">Next.js App Router</span>
                        <span className="text-[10px] text-emerald-400 font-bold">2 Env Vars</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition flex items-center justify-between">
                        <span>Web Integration</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Embed the Payment Hub checkout widget and entitlement verification hooks directly into your React, Next.js, or SPA frontend.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                    Explore Web SDK <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* CARD 3: Database Sync & Webhooks */}
                <div
                  onClick={() => setActiveSection("postgres-schema")}
                  className="group p-5 rounded-2xl border border-slate-800 bg-[#0d1424] hover:border-purple-500/50 hover:bg-[#111a30] transition cursor-pointer shadow-lg space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Visual Card Wireframe Mockup */}
                    <div className="h-28 rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex flex-col justify-between group-hover:border-slate-700 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                          Database & Webhooks
                        </span>
                        <Database className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
                        <div className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          app_subscriptions
                        </div>
                        <div className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          app_transactions
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-[10px] text-slate-400">PostgreSQL / Supabase / MySQL</span>
                        <span className="text-[10px] text-purple-400 font-bold">Auto-Sync</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition flex items-center justify-between">
                        <span>Database Sync & Webhooks</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Automatically sync paid orders, subscriptions, and active licenses directly into PostgreSQL, Supabase, or MySQL via signed webhooks.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-purple-400 flex items-center gap-1">
                    Explore Database Sync <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* CARD 4: API Guide & Licensing Engine */}
                <div
                  onClick={() => setActiveSection("api-reference")}
                  className="group p-5 rounded-2xl border border-slate-800 bg-[#0d1424] hover:border-emerald-500/50 hover:bg-[#111a30] transition cursor-pointer shadow-lg space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Visual Card Wireframe Mockup */}
                    <div className="h-28 rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex flex-col justify-between group-hover:border-slate-700 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-mono">
                          &#123; API &#125; Guide
                        </span>
                        <Terminal className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex gap-2 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">POST /orders</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">GET /check</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-[10px] text-slate-400">RESTful Architecture</span>
                        <span className="text-[10px] text-emerald-400 font-bold">HMAC Verified</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition flex items-center justify-between">
                        <span>API Guide & Licensing Engine</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Secure APIs using REST principles to integrate Payment Hub with your applications, check entitlements, and monitor delivery across tenant apps.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    Explore API Reference <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* QUICKSTART SECTION PREVIEW */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-blue-950/30 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <h3 className="text-sm font-bold text-white">Universal 6-Step Implementation Summary</h3>
                  </div>
                  <button
                    onClick={() => setActiveSection("quickstart")}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    View Step-by-Step Flow <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                  {[
                    { step: "1", title: "Register App", desc: "Get Client ID in /apps" },
                    { step: "2", title: "Setup Plan", desc: "Configure Tiers & Pricing" },
                    { step: "3", title: "Install SDK", desc: "paymentHubClient.ts" },
                    { step: "4", title: "Add Env", desc: "VITE_PAYMENT_HUB_..." },
                    { step: "5", title: "DB Sync", desc: "Optional DDL & Webhook" },
                    { step: "6", title: "Verify Live", desc: "Check Active Licenses" },
                  ].map((s) => (
                    <div key={s.step} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center">
                        {s.step}
                      </span>
                      <p className="font-semibold text-slate-200 text-[11px]">{s.title}</p>
                      <p className="text-[10px] text-slate-400">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* 2. QUICKSTART (6-STEP FLOW) */}
          {/* =============================================================== */}
          {activeSection === "quickstart" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Getting Started</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Quickstart</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">6-Step Setup Flow for Any Tenant Application</h2>
                <p className="text-xs text-slate-400">
                  Follow this verified checklist to integrate Payment Hub with any app (Payroll, CRM, ERP, Autodialer).
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: "Register Your Tenant Application in Payment Hub",
                    desc: "Go to Applications Registry (/apps) and click '+ Add Application'. Set your App Code (e.g. PAYROLL, CRM, ERP) and copy the generated public Client ID.",
                    linkText: "Open Applications Registry",
                    linkHref: "/apps",
                  },
                  {
                    step: 2,
                    title: "Setup Subscription Pricing Tiers",
                    desc: "Go to Subscriptions (/subscriptions) and click '+ Setup New Plan'. Select your target application (which permanently locks the product code). Set tier names (e.g. Professional), monthly/annual pricing, user limits, and comma-separated feature flags.",
                    linkText: "Open Subscriptions Management",
                    linkHref: "/subscriptions",
                  },
                  {
                    step: 3,
                    title: "Install Cashfree Web SDK & Copy Client SDK",
                    desc: "In your application's terminal, run 'npm install @cashfreepayments/cashfree-js'. Then copy 'paymentHubClient.ts' into your project's 'src/lib/' directory.",
                    code: "npm install @cashfreepayments/cashfree-js",
                  },
                  {
                    step: 4,
                    title: "Configure Environment Variables",
                    desc: "Add your Central Payment Hub endpoint and public Client ID to your app's environment file.",
                    code: `VITE_PAYMENT_HUB_URL="http://localhost:3001/api/v1"\nVITE_PAYMENT_HUB_CLIENT_ID="pub_live_..."`,
                  },
                  {
                    step: 5,
                    title: "If App Has Database: Execute Sync DDL & Set Webhook",
                    desc: "Run the standard DDL schema (PostgreSQL / Supabase or MySQL) in your app's database. In Payment Hub /apps, edit your app and set Webhook Destination URL to your app's webhook receiver route.",
                  },
                  {
                    step: 6,
                    title: "Verify License Activation in Live Dashboards",
                    desc: "Perform a test payment via Cashfree Sandbox. Verify that the license appears in the Active Licenses Ledger and that the webhook delivered cleanly in Outbox Queue (/outbox).",
                    linkText: "View Outbox Queue",
                    linkHref: "/outbox",
                  },
                ].map((item) => (
                  <div key={item.step} className="p-4 rounded-xl border border-slate-800 bg-[#0d1424] space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-500/30">
                        {item.step}
                      </div>
                      <div className="space-y-1 flex-1">
                        <h4 className="font-bold text-sm text-white">{item.title}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
                        {item.linkText && item.linkHref && (
                          <Link
                            href={item.linkHref}
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold pt-1"
                          >
                            <span>{item.linkText}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {item.code && (
                          <div className="pt-2">
                            <pre className="p-2.5 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 overflow-x-auto">
                              {item.code}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* 3. ARCHITECTURE & MATRIX */}
          {/* =============================================================== */}
          {activeSection === "architecture" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Getting Started</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Architecture</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Path A (Client-Only) vs Path B (Database Sync)</h2>
                <p className="text-xs text-slate-400">
                  Payment Hub is built to support both lightweight SPAs and heavyweight enterprise database-backed apps with zero conflicts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center">
                      A
                    </span>
                    <h3 className="font-bold text-sm text-white">Path A: Client-Only (Zero Backend)</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Designed for React, Vite, Vue, or static SPAs without their own backend server or database.
                  </p>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li>Uses public Client ID (<code className="text-cyan-300">x-client-id</code>)</li>
                    <li>Built-in CORS directly allows browser calls</li>
                    <li>Cashfree Checkout launches directly in a drop-in modal</li>
                    <li>Checks active license on-demand via <code className="text-cyan-300">/subscriptions/check</code></li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-950/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center">
                      B
                    </span>
                    <h3 className="font-bold text-sm text-white">Path B: Database Sync (Postgres & MySQL)</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Designed for applications with their own PostgreSQL, Supabase, or MySQL databases.
                  </p>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li>Standard tables (<code className="text-purple-300">app_subscriptions</code> & <code className="text-purple-300">app_payment_transactions</code>)</li>
                    <li>Signed webhooks dispatched on payment completion</li>
                    <li>Database triggers immediately provision licenses locally</li>
                    <li>Zero external network latency for entitlement checks inside your app</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* 4. PURE REACT (ZERO BACKEND) */}
          {/* =============================================================== */}
          
          {/* =============================================================== */}
          {/* 4. REACT + SUPABASE FULL-STACK INTEGRATION */}
          {/* =============================================================== */}
          {activeSection === "react-supabase" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Framework Guides</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>React + Supabase</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">React + Supabase Integration Guide</h2>
                    <p className="text-xs text-slate-400">
                      Production architecture combining React frontend, Supabase Edge Functions for webhooks, and automated PostgreSQL database triggers.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex gap-1 shrink-0">
                    <button
                      onClick={() => setReactSubTab("supabase")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        reactSubTab === "supabase" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Full Supabase Sync (Recommended)
                    </button>
                    <button
                      onClick={() => setReactSubTab("pure")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        reactSubTab === "pure" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Zero-Backend (Pure React)
                    </button>
                  </div>
                </div>
              </div>

              {reactSubTab === "supabase" ? (
                <div className="space-y-6">
                  {/* Resiliency Callout Banner */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300 leading-relaxed">
                      <span className="font-bold text-emerald-300">Offline Resilience Guarantee:</span> In this architecture, payment transactions are forwarded to your Supabase Edge Function and written directly into your database. If Payment Hub ever experiences downtime, <strong className="text-white">your React application remains 100% operational</strong> because all entitlement checks query your local Supabase database.
                    </div>
                  </div>

                  {/* Flow Diagram */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220] space-y-2">
                    <div className="text-xs font-bold text-slate-200">End-to-End Data Flow</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                        <div className="font-bold text-blue-400">1. Checkout Modal</div>
                        <div className="text-[11px] text-slate-400 mt-1">User pays in Cashfree modal via React hook</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                        <div className="font-bold text-purple-400">2. Signed Webhook</div>
                        <div className="text-[11px] text-slate-400 mt-1">Payment Hub sends HMAC POST to Supabase Edge Function</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                        <div className="font-bold text-cyan-400">3. DB Trigger</div>
                        <div className="text-[11px] text-slate-400 mt-1">Postgres trigger auto-computes expiry and activates license</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                        <div className="font-bold text-emerald-400">4. Supabase Realtime</div>
                        <div className="text-[11px] text-slate-400 mt-1">React UI unlocks PRO plan instantly with zero page reload</div>
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Install packages */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                      Install Required NPM Packages
                    </h3>
                    <CodeBlock
                      title="Terminal Command"
                      language="bash"
                      code="npm install @cashfreepayments/cashfree-js @supabase/supabase-js"
                    />
                  </div>

                  {/* Step 2: Supabase DDL */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                      Execute DDL Schema & Trigger in Supabase SQL Editor
                    </h3>
                    <p className="text-xs text-slate-400">
                      Run this script in your Supabase dashboard (SQL Editor). It creates the payment ledger table and the auto-activation trigger function.
                    </p>
                    <CodeBlock
                      title="Supabase PostgreSQL Schema & Trigger DDL"
                      language="sql"
                      filePath="supabase/migrations/tenant_subscriptions.sql"
                      code={PG_SYNC_DDL}
                    />
                  </div>

                  {/* Step 3: Edge Function */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">3</span>
                      Deploy Supabase Edge Function (Webhook Receiver)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Create file <code className="text-cyan-400">supabase/functions/payment-hub-webhook/index.ts</code> to receive signed events:
                    </p>
                    <CodeBlock
                      title="Supabase Edge Function (Webhook Handler)"
                      language="typescript"
                      filePath="supabase/functions/payment-hub-webhook/index.ts"
                      code={SUPABASE_EDGE_FUNCTION_CODE}
                    />
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
                      <div className="text-slate-400 text-[11px] mb-1 font-sans">Deploy via Supabase CLI:</div>
                      <div>supabase functions deploy payment-hub-webhook --no-verify-jwt</div>
                      <div>supabase secrets set PAYMENT_HUB_WEBHOOK_SECRET="&lt;YOUR_WEBHOOK_SECRET&gt;"</div>
                    </div>
                  </div>

                  {/* Step 4: Webhook Destination URL in Payment Hub */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">4</span>
                      Configure Webhook Destination URL in Payment Hub
                    </h3>
                    <p className="text-xs text-slate-400">
                      Navigate to <Link href="/apps" className="text-blue-400 hover:underline">Apps Registry</Link>, edit your application, and set your Webhook URL:
                    </p>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300">
                      https://&lt;your-project-ref&gt;.supabase.co/functions/v1/payment-hub-webhook
                    </div>
                  </div>

                  {/* Step 5: React Client Hook */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">5</span>
                      Create React Payment Hook (usePaymentHub)
                    </h3>
                    <CodeBlock
                      title="React Payment Hook"
                      filePath="src/hooks/usePaymentHub.ts"
                      code={`"use client";

import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

export function usePaymentHub() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async (params: {
    amount: number;
    customerPhone: string;
    customerName?: string;
    customerEmail?: string;
    orderNote?: string;
    metadata?: Record<string, any>;
    onSuccess?: (paymentId: string) => void;
    onFailure?: (err: string) => void;
  }) => {
    setLoading(true);
    setError(null);

    const hubUrl = import.meta.env.VITE_PAYMENT_HUB_URL || "http://localhost:3001/api/v1";
    const clientId = import.meta.env.VITE_PAYMENT_HUB_CLIENT_ID;

    try {
      // 1. Create Order in Central Payment Hub
      const res = await fetch(\`\${hubUrl}/orders\`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-client-id": clientId },
        body: JSON.stringify({
          order_id: \`ORD_\${Date.now()}\`,
          order_amount: params.amount,
          customer_details: {
            customer_id: \`CUST_\${params.customerPhone}\`,
            customer_phone: params.customerPhone,
            customer_name: params.customerName || "Customer",
            customer_email: params.customerEmail,
          },
          order_note: params.orderNote,
          metadata: params.metadata || {},
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.payment_session_id) {
        throw new Error(data.error || "Order creation failed");
      }

      // 2. Mount Cashfree Drop-in Modal
      const cashfree = await load({ mode: "sandbox" });
      const result = await cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_modal",
      });

      if (result.error) {
        setError(result.error.message || "Payment cancelled");
        if (params.onFailure) params.onFailure(result.error.message);
        return;
      }

      if (params.onSuccess) params.onSuccess(data.order_id);
    } catch (err: any) {
      setError(err.message || "Payment failed");
      if (params.onFailure) params.onFailure(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { pay, loading, error };
}`}
                    />
                  </div>

                  {/* Step 6: Supabase Realtime Hook */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">6</span>
                      React Realtime Subscription Hook (useSubscription)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Listens directly to your Supabase <code className="text-blue-400">app_subscriptions</code> table so the UI unlocks immediately upon payment:
                    </p>
                    <CodeBlock
                      title="Supabase Realtime Hook"
                      filePath="src/hooks/useSubscription.ts"
                      code={SUPABASE_REALTIME_HOOK_CODE}
                    />
                  </div>

                  {/* Step 7: UI Button */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">7</span>
                      Upgrade / Pay Button Component
                    </h3>
                    <CodeBlock
                      title="Checkout Button Component"
                      filePath="src/components/CheckoutButton.tsx"
                      code={`import React from "react";
import { usePaymentHub } from "@/hooks/usePaymentHub";

export function CheckoutButton({ organizationId = "org_123", amount = 5000 }: { organizationId?: string; amount?: number }) {
  const { pay, loading, error } = usePaymentHub();

  const handleCheckout = () => {
    pay({
      amount,
      customerPhone: "9876543210",
      customerName: "Organization Admin",
      customerEmail: "admin@example.com",
      orderNote: "Annual Pro Subscription",
      metadata: {
        organization_id: organizationId,
        tier: "PRO",
        billing_period: 1,
        period_type: "year",
      },
      onSuccess: () => alert("Payment complete! Your subscription is now active."),
      onFailure: (err) => alert("Payment failed: " + err),
    });
  };

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md"
      >
        {loading ? "Opening Checkout..." : \`Upgrade to Pro (₹\${amount})\`}
      </button>
      {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
    </div>
  );
}`}
                    />
                  </div>
                </div>
              ) : (
                /* Pure React Zero Backend Subtab */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/20 text-xs text-slate-300">
                    <strong className="text-white">Zero-Backend Mode:</strong> Connect your React SPA without setting up Supabase Edge Functions. The React SDK queries Payment Hub's <code className="text-blue-400">/check</code> endpoint directly on demand.
                  </div>
                  <CodeBlock
                    title="1. Configure React Environment (.env)"
                    filePath=".env"
                    code={`# Central Payment Hub Client Configuration\nVITE_PAYMENT_HUB_URL="http://localhost:3001/api/v1"\nVITE_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"`}
                  />
                  <CodeBlock
                    title="2. Check License from React using Universal SDK"
                    filePath="src/lib/checkAccess.ts"
                    code={`import { PaymentHubClient } from "@/lib/paymentHubClient";

const client = new PaymentHubClient({
  hubUrl: import.meta.env.VITE_PAYMENT_HUB_URL,
  clientId: import.meta.env.VITE_PAYMENT_HUB_CLIENT_ID,
});

export async function hasProAccess(orgId: string): Promise<boolean> {
  const license = await client.checkSubscription(orgId);
  return license.has_active_subscription && license.tier === "PRO";
}`}
                  />
                </div>
              )}
            </div>
          )}

          {activeSection === "react" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Web Integration</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Pure React</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Pure React / Vite (Zero Backend Required)</h2>
                <p className="text-xs text-slate-400">
                  Connect your React frontend using only 2 public environment variables. No server routes or database required.
                </p>
              </div>

              <div className="space-y-4">
                <CodeBlock
                  title="1. Configure React Environment (.env)"
                  filePath=".env"
                  code={`# Central Payment Hub Client Configuration\nVITE_PAYMENT_HUB_URL="http://localhost:3001/api/v1"\nVITE_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"`}
                />

                <CodeBlock
                  title="2. React Payment Hook (src/hooks/usePaymentHub.ts)"
                  filePath="src/hooks/usePaymentHub.ts"
                  code={`"use client";

import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

export function usePaymentHub() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async (params: {
    amount: number;
    customerPhone: string;
    customerName?: string;
    customerEmail?: string;
    orderNote?: string;
    onSuccess?: (paymentId: string) => void;
    onFailure?: (err: string) => void;
  }) => {
    setLoading(true);
    setError(null);

    const hubUrl = import.meta.env.VITE_PAYMENT_HUB_URL || "http://localhost:3001/api/v1";
    const clientId = import.meta.env.VITE_PAYMENT_HUB_CLIENT_ID;

    try {
      // 1. Create Order
      const res = await fetch(\`\${hubUrl}/orders\`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-client-id": clientId },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || !data.payment_session_id) throw new Error(data.error || "Order creation failed");

      // 2. Launch Cashfree Drop-in Modal
      const cashfree = await load({ mode: "sandbox" });
      const result = await cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_modal",
      });

      if (result.error) {
        setError(result.error.message || "Payment aborted");
        if (params.onFailure) params.onFailure(result.error.message || "Payment aborted");
        return;
      }

      if (params.onSuccess) params.onSuccess(data.order_id);
    } catch (err: any) {
      setError(err.message || "Payment failed");
      if (params.onFailure) params.onFailure(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { pay, loading, error };
}`}
                />

                <CodeBlock
                  title="3. Client Checkout Component (src/components/CheckoutButton.tsx)"
                  filePath="src/components/CheckoutButton.tsx"
                  code={`import React from "react";
import { usePaymentHub } from "@/hooks/usePaymentHub";

export function CheckoutButton({ amount = 5000 }: { amount?: number }) {
  const { pay, loading, error } = usePaymentHub();

  const handleCheckout = () => {
    pay({
      amount,
      customerPhone: "9876543210",
      customerName: "Acme Corp Admin",
      customerEmail: "admin@acme.com",
      orderNote: "Professional Plan Upgrade",
      onSuccess: (paymentId) => {
        alert("Payment Succeeded! License activated: " + paymentId);
        window.location.reload();
      },
      onFailure: (err) => alert("Payment Failed: " + err),
    });
  };

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
      >
        {loading ? "Launching Payment..." : \`Pay ₹\${amount} & Upgrade\`}
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}`}
                />
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* 5. NEXT.JS APP ROUTER */}
          {/* =============================================================== */}
          {activeSection === "nextjs" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Web Integration</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Next.js</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">Next.js 13 / 14 / 15 App Router Integration</h2>
                    <p className="text-xs text-slate-400">
                      Choose between <strong>Client-Only (2 Variables)</strong> or <strong>Full-Stack with Server Routes</strong>.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex gap-1 shrink-0">
                    <button
                      onClick={() => setNextjsSubTab("client")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        nextjsSubTab === "client" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Client-Only (2 Vars)
                    </button>
                    <button
                      onClick={() => setNextjsSubTab("fullstack")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        nextjsSubTab === "fullstack" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Full-Stack (Server Route)
                    </button>
                  </div>
                </div>
              </div>

                            {nextjsSubTab === "client" ? (
                <div className="space-y-4">
                  <CodeBlock
                    title="1. Next.js .env.local (Only 2 Public Variables)"
                    filePath=".env.local"
                    code={`NEXT_PUBLIC_PAYMENT_HUB_URL="http://localhost:3001/api/v1"\nNEXT_PUBLIC_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"`}
                  />

                  <CodeBlock
                    title="2. Client Hook (hooks/usePaymentHub.ts)"
                    filePath="hooks/usePaymentHub.ts"
                    code={`"use client";

import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

export function usePaymentHub() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async (params: {
    amount: number;
    customerPhone: string;
    customerName?: string;
    customerEmail?: string;
    orderNote?: string;
    metadata?: Record<string, any>;
    onSuccess?: (paymentId: string) => void;
    onFailure?: (err: string) => void;
  }) => {
    setLoading(true);
    setError(null);

    const hubUrl = process.env.NEXT_PUBLIC_PAYMENT_HUB_URL || "http://localhost:3001/api/v1";
    const clientId = process.env.NEXT_PUBLIC_PAYMENT_HUB_CLIENT_ID;

    try {
      const res = await fetch(\`\${hubUrl}/orders\`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-client-id": clientId! },
        body: JSON.stringify({
          order_id: \`ORD_\${Date.now()}\`,
          order_amount: params.amount,
          customer_details: {
            customer_id: \`CUST_\${params.customerPhone}\`,
            customer_phone: params.customerPhone,
            customer_name: params.customerName,
            customer_email: params.customerEmail,
          },
          order_note: params.orderNote,
          metadata: params.metadata || {},
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.payment_session_id) throw new Error(data.error || "Order creation failed");

      const cashfree = await load({ mode: "sandbox" });
      const result = await cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_modal",
      });

      if (result.error) {
        setError(result.error.message || "Payment cancelled");
        if (params.onFailure) params.onFailure(result.error.message);
        return;
      }

      if (params.onSuccess) params.onSuccess(data.order_id);
    } catch (err: any) {
      setError(err.message || "Payment failed");
      if (params.onFailure) params.onFailure(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { pay, loading, error };
}`}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                      Environment Variables (.env.local)
                    </h3>
                    <CodeBlock
                      title="Next.js Full-Stack Environment"
                      filePath=".env.local"
                      code={`# Client-accessible URL\nNEXT_PUBLIC_PAYMENT_HUB_URL="http://localhost:3001/api/v1"\n\n# Server-only credentials (Never exposed to browser)\nPAYMENT_HUB_CLIENT_ID="pub_live_nextapp_xxxx"\nPAYMENT_HUB_CLIENT_SECRET="sec_live_nextapp_xxxx"\nPAYMENT_HUB_WEBHOOK_SECRET="whsec_nextapp_xxxx"`}
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
                      Server API Route for Secure Order Creation
                    </h3>
                    <CodeBlock
                      title="Order Creation Server Route"
                      filePath="app/api/create-order/route.ts"
                      code={`import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const hubRes = await fetch(\`\${process.env.PAYMENT_HUB_URL}/orders\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": process.env.PAYMENT_HUB_CLIENT_ID!,
      "x-client-secret": process.env.PAYMENT_HUB_CLIENT_SECRET!,
    },
    body: JSON.stringify({
      order_id: \`ORD_\${Date.now()}\`,
      order_amount: body.amount,
      customer_details: body.customer,
      metadata: body.metadata || {},
    }),
  });

  const data = await hubRes.json();
  return NextResponse.json(data, { status: hubRes.status });
}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">3</span>
                      Next.js Webhook Receiver (HMAC-SHA256 Verification)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Receives signed webhook notifications from Payment Hub Outbox and updates the local database:
                    </p>
                    <CodeBlock
                      title="Next.js Signed Webhook Handler"
                      filePath="app/api/webhooks/payment-hub/route.ts"
                      code={NEXTJS_WEBHOOK_ROUTE_CODE}
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">4</span>
                      Middleware / Route Guard License Check
                    </h3>
                    <p className="text-xs text-slate-400">
                      Protects dashboard pages and redirects unlicensed users to the upgrade screen:
                    </p>
                    <CodeBlock
                      title="Next.js Middleware License Guard"
                      filePath="middleware.ts"
                      code={NEXTJS_MIDDLEWARE_CODE}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* 6. UNIVERSAL CLIENT SDK */}
          {/* =============================================================== */}
          {(activeSection === "universal-sdk" || activeSection === "modal-hook") && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Web Integration</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Universal SDK</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Universal Client SDK (paymentHubClient.ts)</h2>
                <p className="text-xs text-slate-400">
                  A single drop-in TypeScript class providing checkout, entitlement verification, and plan fetching for any frontend.
                </p>
              </div>

              <CodeBlock
                title="Universal Payment Hub Client SDK"
                filePath="src/lib/paymentHubClient.ts"
                code={CLIENT_SDK_CODE}
              />
            </div>
          )}

          {/* =============================================================== */}
          {/* 7. POSTGRESQL & SUPABASE SCHEMA */}
          {/* =============================================================== */}
          {(activeSection === "postgres-schema" || activeSection === "db-sync-overview") && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Database Sync</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>PostgreSQL / Supabase</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Standard DDL Schema & Trigger (PostgreSQL / Supabase)</h2>
                <p className="text-xs text-slate-400">
                  Execute this SQL in your tenant app's database. It creates standard subscription tables and a trigger that auto-activates licenses upon paid orders.
                </p>
              </div>

              <CodeBlock
                title="PostgreSQL / Supabase Sync DDL"
                filePath="tenant_sync_schema.sql"
                language="sql"
                code={PG_SYNC_DDL}
              />
            </div>
          )}

          {/* =============================================================== */}
          {/* 8. MYSQL 8.0+ SCHEMA */}
          {/* =============================================================== */}
          {activeSection === "mysql-schema" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Database Sync</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>MySQL</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Standard DDL Schema (MySQL 8.0+)</h2>
                <p className="text-xs text-slate-400">
                  For PHP, Laravel, Node/Express, or Go backends using MySQL.
                </p>
              </div>

              <CodeBlock
                title="MySQL 8.0+ Sync DDL"
                filePath="tenant_mysql_schema.sql"
                language="sql"
                code={MYSQL_SYNC_DDL}
              />
            </div>
          )}

          {/* =============================================================== */}
          {/* 9. WEBHOOKS & EDGE WORKERS */}
          {/* =============================================================== */}
          {(activeSection === "webhooks" || activeSection === "edge-worker") && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Backend & Webhooks</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Edge Functions</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Signed Webhooks & Edge Functions</h2>
                <p className="text-xs text-slate-400">
                  Payment Hub dispatches signed HMAC-SHA256 events upon payment completion. Your webhook listener verifies and inserts into your database.
                </p>
              </div>

              <CodeBlock
                title="Edge Webhook Receiver (Cloudflare Workers / Node.js)"
                filePath="webhook_handler.ts"
                code={EDGE_WORKER_CODE}
              />
            </div>
          )}

          

          {/* =============================================================== */}
          {/* 11. ENTITLEMENTS & EXPIRATION */}
          {/* =============================================================== */}
          {(activeSection === "entitlements" || activeSection === "expiration") && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Subscriptions & Licensing</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Entitlements</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Entitlement Checks & Automated Expiration</h2>
                <p className="text-xs text-slate-400">
                  Protect premium routes and features in your tenant apps with high-speed entitlement verification.
                </p>
              </div>

              <CodeBlock
                title="Entitlement Check Endpoint (GET /api/v1/subscriptions/check)"
                code={`// Example Request:
GET /api/v1/subscriptions/check?orgId=ORG_ACME&feature=whatsapp_inbox HTTP/1.1
Host: localhost:3001
x-client-id: pub_live_payroll_d42a8b9e...

// Example Response (200 OK):
{
  "hasAccess": true,
  "isActive": true,
  "tier": "Professional",
  "tierLevel": 2,
  "daysRemaining": 29,
  "userLimit": 5,
  "features": ["crm_leads", "whatsapp_inbox", "export_pdf"],
  "expiresAt": "2026-12-11T12:00:00.000Z"
}`}
              />
            </div>
          )}

          {/* =============================================================== */}
          {/* 12. REST API REFERENCE */}
          {/* =============================================================== */}
          {(activeSection === "api-reference" || activeSection === "signature-verification" || activeSection === "error-codes") && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>APIs & Security</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>REST API Reference</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Central Payment Hub REST API Reference</h2>
                <p className="text-xs text-slate-400">
                  All endpoints require <code className="text-blue-400">x-client-id</code> in headers.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0d1424]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Method</th>
                      <th className="p-3">Endpoint</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Auth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    <tr>
                      <td className="p-3"><span className="text-emerald-400 font-bold">POST</span></td>
                      <td className="p-3 text-white">/api/v1/orders</td>
                      <td className="p-3 font-sans text-slate-300">Create Cashfree order & return paymentSessionId</td>
                      <td className="p-3 text-blue-400">x-client-id</td>
                    </tr>
                    <tr>
                      <td className="p-3"><span className="text-blue-400 font-bold">GET</span></td>
                      <td className="p-3 text-white">/api/v1/orders/:orderId/status</td>
                      <td className="p-3 font-sans text-slate-300">Poll payment status (PAID / PENDING / FAILED)</td>
                      <td className="p-3 text-blue-400">x-client-id</td>
                    </tr>
                    <tr>
                      <td className="p-3"><span className="text-blue-400 font-bold">GET</span></td>
                      <td className="p-3 text-white">/api/v1/subscriptions/check</td>
                      <td className="p-3 font-sans text-slate-300">Check organization license & feature flags</td>
                      <td className="p-3 text-blue-400">x-client-id</td>
                    </tr>
                    <tr>
                      <td className="p-3"><span className="text-blue-400 font-bold">GET</span></td>
                      <td className="p-3 text-white">/api/v1/subscriptions/offers</td>
                      <td className="p-3 font-sans text-slate-300">Fetch configured pricing tiers for client app</td>
                      <td className="p-3 text-blue-400">x-client-id</td>
                    </tr>
                    <tr>
                      <td className="p-3"><span className="text-emerald-400 font-bold">POST</span></td>
                      <td className="p-3 text-white">/api/v1/webhooks/cashfree</td>
                      <td className="p-3 font-sans text-slate-300">Cashfree incoming payment webhook receiver</td>
                      <td className="p-3 text-slate-400">HMAC-SHA256</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* 13. SANDBOX & TESTING */}
          {/* =============================================================== */}
          {(activeSection === "sandbox-testing" || activeSection === "simulation-script" || activeSection === "go-live") && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Testing & Sandbox</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Simulator</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Cashfree Sandbox Test Credentials</h2>
                <p className="text-xs text-slate-400">
                  Use these simulated test credentials when checking out in Sandbox mode.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1424] space-y-1">
                  <span className="text-[10px] text-blue-400 font-bold uppercase">Success Card (OTP 777777)</span>
                  <p className="font-mono text-sm font-bold text-white">4111 1111 1111 1111</p>
                  <p className="text-[11px] text-slate-400">Exp: 12/28 • CVV: 123</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1424] space-y-1">
                  <span className="text-[10px] text-rose-400 font-bold uppercase">Failure Test Card</span>
                  <p className="font-mono text-sm font-bold text-white">4000 0000 0000 0002</p>
                  <p className="text-[11px] text-slate-400">Simulates Bank Decline</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1424] space-y-1">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Simulated UPI</span>
                  <p className="font-mono text-sm font-bold text-white">success@upi</p>
                  <p className="text-[11px] text-slate-400">Instant UPI Approval</p>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* 14. AI PROMPT TOOLS */}
          {/* =============================================================== */}
          {(activeSection === "ai-prompt-react" || activeSection === "ai-prompt-nextjs") && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>AI Tools</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Auto-Integration Prompts</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">One-Shot AI Coding Assistant Prompts</h2>
                <p className="text-xs text-slate-400">
                  Copy and paste directly into Cursor, Antigravity, Copilot, or Claude Code.
                </p>
              </div>

              <CodeBlock
                title="One-Shot React Auto-Integration Prompt"
                code={REACT_AI_AGENT_PROMPT}
              />

              <CodeBlock
                title="One-Shot Next.js Auto-Integration Prompt"
                code={NEXTJS_AI_AGENT_PROMPT}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
