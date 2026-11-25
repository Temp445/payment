"use client";

import React, { useState, useMemo, useEffect } from "react";
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

function getReactAiPrompt(hubOrigin: string) {
  const cleanOrigin = hubOrigin.replace(/\/$/, "");
  const guideUrl = `${cleanOrigin}/guide`;
  const apiUrl = `${cleanOrigin}/api/v1`;

  return `You are an expert React / Vite frontend developer. Integrate Central Payment Hub checkout and licensing into this React application by following these instructions step-by-step:

### Official Guide & Reference Documentation
• Integration Guide URL: ${guideUrl}
• Central Payment Hub API Base URL: ${apiUrl}
• Cashfree Drop-in Checkout Docs: ${guideUrl}#dropin-vs-hosted

### Step 1: Install Cashfree Web SDK
Run in terminal:
npm install @cashfreepayments/cashfree-js

### Step 2: Configure Environment Variables
Add to your ".env" file:
VITE_PAYMENT_HUB_URL="${apiUrl}"
VITE_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"

### Step 3: Create Hook (src/hooks/usePaymentHub.ts)
Create "src/hooks/usePaymentHub.ts" with dynamic mode detection, Cashfree dropin modal support, payment polling, and error handling.
IMPORTANT RULE: Trigger order creation ONLY when the user clicks the payment button in pay(). Do NOT eagerly create orders on page load/mount or card hover to prevent creating abandoned/ghost orders.
(Reference complete code at: ${guideUrl}#react-vite)

### Step 4: Add <CheckoutButton />
Create "src/components/CheckoutButton.tsx" to trigger payments when clicked. (Reference complete code at: ${guideUrl}#react-vite)

### Step 5: Webhook Receiver / Backend Order Confirmation
If using Supabase Edge Functions or a backend server, deploy a webhook receiver at /functions/v1/payment-hub-webhook to verify signatures with PAYMENT_HUB_WEBHOOK_SECRET and update order status in the database.
Configure this Webhook Destination URL in Payment Hub (/apps) for guaranteed background delivery.

### Step 6: Verify Whitelisting
Ensure your client frontend domain (e.g. http://localhost:5173 or your production domain) is whitelisted in Cashfree Merchant Dashboard under Developers > Whitelisting.`;
}

function getNextJsAiPrompt(hubOrigin: string) {
  const cleanOrigin = hubOrigin.replace(/\/$/, "");
  const guideUrl = `${cleanOrigin}/guide`;
  const apiUrl = `${cleanOrigin}/api/v1`;

  return `You are an expert Next.js developer. Integrate Central Payment Hub checkout and webhook payment fulfillment into this Next.js application by following these instructions step-by-step:

### Official Guide & Reference Documentation
• Integration Guide URL: ${guideUrl}
• Central Payment Hub API Base URL: ${apiUrl}
• Next.js App Router Architecture: ${guideUrl}#nextjs-app-router

### Step 1: Install Cashfree SDK
npm install @cashfreepayments/cashfree-js

### Step 2: Configure Environment Variables (.env.local)
NEXT_PUBLIC_PAYMENT_HUB_URL="${apiUrl}"
NEXT_PUBLIC_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"
PAYMENT_HUB_WEBHOOK_SECRET="<YOUR_WEBHOOK_SECRET>" # Found in Payment Hub /apps

### Step 3: Create Hook (hooks/usePaymentHub.ts)
"use client";
import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

// IMPORTANT RULE: Trigger order creation ONLY on user click in pay(). Do NOT auto-create orders on page load/mount to prevent ghost orders.
// Handles payment initiation, dynamic mode detection, Cashfree drop-in popup, and real-time status polling. Reference full architecture at: ${guideUrl}#nextjs-app-router

### Step 4: Add Checkout Action / Button
Create a client component calling usePaymentHub().pay({ amount, customerPhone, ... }) only when the user deliberately clicks the button.

### Step 5: Create Webhook Receiver (app/api/webhooks/payment-hub/route.ts)
Create a Next.js App Router route "app/api/webhooks/payment-hub/route.ts" to receive signed POST events from Central Payment Hub Outbox Queue:
• Verify HMAC-SHA256 signature from "x-hub-signature" header using PAYMENT_HUB_WEBHOOK_SECRET.
• Check idempotency (prevent duplicate order recording).
• Insert payment record into database and fulfill customer order / update status to PAID.
• Return HTTP 200 { received: true }.

### Step 6: Configure Webhook Destination URL in Payment Hub
In Central Payment Hub (/apps), edit this application and set:
Webhook Destination URL: https://<your-domain>/api/webhooks/payment-hub

### Step 7: Verify Whitelisting
Ensure your frontend domain (e.g. http://localhost:3000 or production domain) is added to Cashfree Merchant Dashboard under Developers > Whitelisting.`;
}

const CLIENT_SDK_CODE = `/**
 * Universal Payment Hub Client SDK (paymentHubClient.ts)
 * Plug-and-play for Pure React, Next.js, Vue, or Vanilla JS.
 */
import { load } from "@cashfreepayments/cashfree-js";

export interface HubConfig {
  hubUrl: string;       // e.g. "https://acepaymenthub.netlify.app/api/v1"
  clientId: string;     // e.g. "pub_live_payroll_..."
}

export class PaymentHubClient {
  private hubUrl: string;
  private clientId: string;

  constructor(config: HubConfig) {
    this.hubUrl = config.hubUrl.replace(/\\/$/, "");
    this.clientId = config.clientId;
  }

  // 1. Poll Order & Payment Status on Demand
  async getOrderStatus(orderId: string) {
    const res = await fetch(\`\${this.hubUrl}/orders/\${encodeURIComponent(orderId)}/status\`, {
      headers: { "x-client-id": this.clientId }
    });
    return res.json();
  }

  // 2. Initiate Cashfree Drop-in Checkout
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
        order_id: \`ORD_\${Date.now()}\`,
        order_amount: params.amount,
        customer_details: {
          customer_id: \`CUST_\${params.customerPhone}\`,
          customer_phone: params.customerPhone,
          customer_email: params.customerEmail,
          customer_name: params.customerName
        },
        order_note: params.orderNote,
        metadata: params.metadata || {}
      })
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.payment_session_id) {
      throw new Error(orderData.error || "Order creation failed");
    }

    // B. Launch Cashfree Drop-in with dynamic mode detection returned by Payment Hub
    const sdkMode = orderData.mode || orderData.environment || "sandbox";
    const cashfree = await load({ mode: sdkMode as any });
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
-- Tenant App Database Schema (PostgreSQL / Supabase)
-- Run this script in your application's database (CRM, Store, ERP).
-- ============================================================================

-- 1. App Orders Table
CREATE TABLE IF NOT EXISTS public.app_orders (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    order_id TEXT UNIQUE NOT NULL,           -- Order reference passed to Payment Hub
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    customer_email TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'PAID', 'FAILED', 'EXPIRED'
    payment_id TEXT,                         -- Cashfree payment ID
    payment_method TEXT,
    order_note TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_orders_status ON public.app_orders(status);
CREATE INDEX IF NOT EXISTS idx_app_orders_created ON public.app_orders(created_at DESC);

-- 2. App Payments Ledger (Audit of every verified payment from Payment Hub Webhooks)
CREATE TABLE IF NOT EXISTS public.app_payments (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.app_orders(order_id) ON DELETE CASCADE,
    payment_id TEXT UNIQUE NOT NULL,         -- Cashfree payment ID (cf_payment_id)
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    payment_method TEXT,
    raw_payload JSONB,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_payments_order ON public.app_payments(order_id);

-- 3. Automated Order Fulfillment Trigger Function
CREATE OR REPLACE FUNCTION public.handle_order_payment_fulfillment()
RETURNS TRIGGER AS $BODY$
BEGIN
    -- Only process successful payments
    IF NEW.status IN ('SUCCESS', 'PAID', 'captured') THEN
        UPDATE public.app_orders
        SET status = 'PAID',
            payment_id = NEW.payment_id,
            payment_method = NEW.payment_method,
            updated_at = NOW()
        WHERE order_id = NEW.order_id;
    END IF;

    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

-- 4. Attach Trigger to app_payments
DROP TRIGGER IF EXISTS trg_fulfill_app_order ON public.app_payments;
CREATE TRIGGER trg_fulfill_app_order
AFTER INSERT ON public.app_payments
FOR EACH ROW EXECUTE FUNCTION public.handle_order_payment_fulfillment();`;

const MYSQL_SYNC_DDL = `-- ============================================================================
-- Standard Tenant App Database Schema (MySQL 8.0+)
-- Run this in your MySQL database (e.g. for PHP, Laravel, or Node/Express apps).
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_orders (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100) NULL,
    customer_email VARCHAR(100) NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    payment_id VARCHAR(100) NULL,
    payment_method VARCHAR(50) NULL,
    order_note TEXT NULL,
    metadata JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_orders_status (status),
    KEY idx_orders_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_payments (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(100) NOT NULL,
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    payment_method VARCHAR(50) NULL,
    raw_payload JSON NULL,
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_payments_order (order_id),
    CONSTRAINT fk_app_payments_order FOREIGN KEY (order_id) REFERENCES app_orders (order_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

const EDGE_WORKER_CODE = `/**
 * Edge Webhook Receiver (Cloudflare Workers / Supabase Edge / Node.js)
 * Receives signed PAYMENT.SUCCESS event from Payment Hub Outbox and updates tenant database.
 */
import crypto from "crypto";

export async function handlePaymentWebhook(req: Request, env: any) {
  const signature = req.headers.get("x-hub-signature");
  const rawBody = await req.text();

  // 1. Verify HMAC-SHA256 Signature
  const expectedSignature = crypto
    .createHmac("sha256", env.PAYMENT_HUB_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const { event_type, order_id, payment_id, amount, currency } = payload;

  if (event_type === "PAYMENT.SUCCESS") {
    // 2. Insert into app_payments
    // The PostgreSQL trigger will automatically update app_orders status to PAID!
    await db.query(\`
      INSERT INTO public.app_payments (
        order_id, payment_id, amount, currency, status,
        payment_method, raw_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (payment_id) DO NOTHING
    \`, [
      order_id,
      payment_id,
      amount,
      currency || "INR",
      "SUCCESS",
      payload.payment_method || "UPI",
      JSON.stringify(payload)
    ]);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};`;

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
 * Receives signed webhooks from Central Payment Hub and inserts into app_payments.
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

      // 3. Insert into the app_payments ledger
      // The Postgres trigger 'trg_fulfill_app_order' will automatically mark app_orders as PAID!
      const { error } = await supabase.from("app_payments").insert({
        order_id: payload.order_id,
        payment_id: payload.payment_id,
        amount: payload.amount,
        currency: payload.currency || "INR",
        status: "SUCCESS",
        payment_method: payload.payment_method || "UPI",
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
 * React Realtime Order Status Hook
 * File location: src/hooks/useOrderStatus.ts
 *
 * Listens to postgres_changes on 'app_orders'.
 * When Payment Hub's webhook is processed by the Edge Function,
 * the UI automatically updates order status to PAID in real-time with zero page refresh!
 */
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function useOrderStatus(orderId: string) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    // 1. Initial Fetch of current order status
    supabase
      .from("app_orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle()
      .then(({ data }) => {
        setOrder(data);
        setLoading(false);
      });

    // 2. Realtime WebSocket: Updates instantly when webhook triggers fulfillment!
    const channel = supabase
      .channel(\`order_\${orderId}\`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_orders",
          filter: \`order_id=eq.\${orderId}\`,
        },
        (payload) => {
          console.log("[Supabase Realtime] Order status updated:", payload.new);
          setOrder(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { order, isPaid: order?.status === "PAID", loading };
};`;

const NEXTJS_WEBHOOK_ROUTE_CODE = `/**
 * Next.js Webhook Receiver (App Router)
 * File location: app/api/webhooks/payment-hub/route.ts
 *
 * Receives signed PAYMENT.SUCCESS events from Central Payment Hub.
 * Verifies HMAC-SHA256 signature and records into the app orders ledger.
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
      // 2. Insert into app_payments (Database Trigger handles app_orders fulfillment)
      console.log("[Next.js Webhook] Payment verified for order:", payload.order_id);

      // Example SQL query:
      // await db.query(
      //   \`INSERT INTO public.app_payments (
      //      order_id, payment_id, amount, currency, status,
      //      payment_method, raw_payload
      //    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      //    ON CONFLICT (payment_id) DO NOTHING\`,
      //   [
      //     payload.order_id, payload.payment_id, payload.amount, payload.currency || "INR",
      //     "SUCCESS", payload.payment_method || "UPI", JSON.stringify(payload)
      //   ]
      // );
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};`;

const NEXTJS_MIDDLEWARE_CODE = `/**
 * Next.js Middleware / Route Guard
 * File location: middleware.ts
 *
 * Verifies order payment status for protected checkout receipts / premium areas.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order_id");

  if (orderId && req.nextUrl.pathname.startsWith("/order-confirmation")) {
    try {
      const res = await fetch(\`\${process.env.PAYMENT_HUB_URL}/orders/\${orderId}/status\`, {
        headers: { "x-client-id": process.env.PAYMENT_HUB_CLIENT_ID! },
        cache: "no-store",
      });
      const data = await res.json();

      if (data.order_status !== "PAID") {
        return NextResponse.redirect(new URL("/checkout?status=pending", req.url));
      }
    } catch (e) {
      console.error("Order status check failed", e);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/order-confirmation/:path*"],
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
    title: "APIs & Security",
    icon: Lock,
    items: [
      { id: "order-lifecycle", title: "Order Lifecycle & Status", badge: "Realtime" },
      { id: "api-reference", title: "REST API Reference", badge: "v1" },
    ],
  },
  {
    title: "Testing & Sandbox",
    icon: Cpu,
    items: [
      { id: "sandbox-testing", title: "Cashfree Sandbox & Cards" },
      { id: "performance-optimization", title: "⚡ 1-2s Popup Optimization", badge: "Speed" },
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
  const [mobileDocsNavOpen, setMobileDocsNavOpen] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState("https://acepaymenthub.netlify.app");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const reactAiPrompt = useMemo(() => getReactAiPrompt(currentOrigin), [currentOrigin]);
  const nextjsAiPrompt = useMemo(() => getNextJsAiPrompt(currentOrigin), [currentOrigin]);

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
    <div className="flex-1 -m-3.5 sm:-m-5 md:-m-8 min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans">
      {/* Top Bar matching Zoho Developer Docs style */}
      <header className="sticky top-0 z-30 h-14 bg-[#0a0f1d]/95 backdrop-blur border-b border-slate-800/80 px-3 sm:px-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={() => setMobileDocsNavOpen(!mobileDocsNavOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700 text-xs flex items-center gap-1 cursor-pointer"
            aria-label="Toggle Documentation Navigation"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xs:inline">Docs</span>
          </button>
          <div className="flex items-center gap-2.5">
            {/* <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm sm:text-base shadow-md shadow-blue-900/40">
              P
            </div> */}
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* <span className="font-bold text-xs sm:text-sm tracking-tight text-white">Payment Hub</span> */}
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                  Developer Docs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Search Input */}
        <div className="flex-1 max-w-md mx-2 sm:mx-6">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docs, APIs, hooks..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="hidden lg:inline-flex text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Cashfree v2023
          </span>
          <Link
            href="/apps"
            className="text-xs px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <span>Apps</span>
            <ExternalLink className="w-3 h-3 hidden sm:inline" />
          </Link>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Docs Drawer Overlay */}
        {mobileDocsNavOpen && (
          <div
            onClick={() => setMobileDocsNavOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          />
        )}

        {/* ================================================================= */}
        {/* LEFT SIDEBAR NAVIGATION (Collapsible tree like Zoho Docs) */}
        {/* ================================================================= */}
        <aside
          className={`w-64 shrink-0 bg-[#070b14] border-r border-slate-800/80 p-3 overflow-y-auto ${
            mobileDocsNavOpen
              ? "fixed inset-y-0 left-0 z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 bg-[#070b14]"
              : "hidden md:block"
          }`}
        >
          {mobileDocsNavOpen && (
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 md:hidden">
              <span className="font-bold text-xs uppercase text-slate-400">Documentation Topics</span>
              <button
                onClick={() => setMobileDocsNavOpen(false)}
                className="text-xs text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
          )}
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
                            onClick={() => {
                              setActiveSection(item.id);
                              setMobileDocsNavOpen(false);
                            }}
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
        <main className="flex-1 p-3.5 sm:p-6 lg:p-10 overflow-y-auto w-full">
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
                          app_orders
                        </div>
                        <div className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          app_payments
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
                        Automatically sync paid orders and verified payment transactions directly into PostgreSQL, Supabase, or MySQL via signed webhooks.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-purple-400 flex items-center gap-1">
                    Explore Database Sync <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* CARD 4: API Guide & Order Lifecycle */}
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
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">GET /status</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-[10px] text-slate-400">RESTful Architecture</span>
                        <span className="text-[10px] text-emerald-400 font-bold">HMAC Verified</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition flex items-center justify-between">
                        <span>API Reference & Order Lifecycle</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Secure APIs using REST principles to integrate Payment Hub with your applications, poll order status, and receive verified webhooks.
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
                    { step: "2", title: "Run SQL DDL", desc: "App Orders & Fulfillment Trigger" },
                    { step: "3", title: "Deploy Webhook", desc: "Supabase Edge Function" },
                    { step: "4", title: "Add Env Vars", desc: "VITE_PAYMENT_HUB_..." },
                    { step: "5", title: "Drop-in Modal", desc: "Cashfree Checkout Hook" },
                    { step: "6", title: "Live Realtime", desc: "Instant Order Confirmation" },
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
                    desc: "Go to Applications Registry (/apps) and click '+ Add Application'. Set your App Code (e.g. PAYROLL, CRM, ERP) and copy the generated public Client ID and Webhook Secret.",
                    linkText: "Open Applications Registry",
                    linkHref: "/apps",
                  },
                  {
                    step: 2,
                    title: "Execute DDL & Order Fulfillment Trigger in Tenant DB",
                    desc: "Execute the PostgreSQL schema in your Supabase SQL Editor. This creates public.app_orders and public.app_payments with an automatic order-fulfillment trigger.",
                  },
                  {
                    step: 3,
                    title: "Deploy Webhook Receiver & Configure URL in /apps",
                    desc: "Deploy your Supabase Edge Function ('payment-hub-webhook') or Next.js API route. In Payment Hub /apps, edit your app and paste the Webhook Destination URL.",
                    linkText: "Manage Registered Apps",
                    linkHref: "/apps",
                  },
                  {
                    step: 4,
                    title: "Configure Environment Variables in App",
                    desc: "Add your Central Payment Hub endpoint and public Client ID to your app's .env file.",
                    code: `VITE_PAYMENT_HUB_URL="https://acepaymenthub.netlify.app/api/v1"\nVITE_PAYMENT_HUB_CLIENT_ID="pub_live_..."`,
                  },
                  {
                    step: 5,
                    title: "Launch Cashfree Drop-in Checkout Modal",
                    desc: "Use the usePaymentHub hook or CheckoutButton component to launch the Cashfree drop-in modal, passing your order details and customer metadata.",
                  },
                  {
                    step: 6,
                    title: "Verify Audit Copy & Live Realtime Payment Confirmation",
                    desc: "Perform a test payment. Verify that Payment Hub saved an audit copy in 'orders' and 'payments', and that your tenant app's order status turned to PAID live via Supabase Realtime.",
                    linkText: "View Outbox Deliveries",
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
                    <li>Polls payment status on-demand via <code className="text-cyan-300">/orders/:id/status</code></li>
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
                    <li>Standard tables (<code className="text-purple-300">app_orders</code> & <code className="text-purple-300">app_payments</code>)</li>
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
                      filePath="supabase/migrations/tenant_orders.sql"
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

    const hubUrl = import.meta.env.VITE_PAYMENT_HUB_URL || "https://acepaymenthub.netlify.app/api/v1";
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
                      React Realtime Order Hook (useOrderStatus)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Listens directly to your Supabase <code className="text-blue-400">app_orders</code> table so the UI confirms payment immediately upon webhook processing:
                    </p>
                    <CodeBlock
                      title="Supabase Realtime Hook"
                      filePath="src/hooks/useOrderStatus.ts"
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

export function CheckoutButton({
  amount = 5000,
}: {
  amount?: number;
}) {
  const { pay, loading, error } = usePaymentHub();

  const handleCheckout = () => {
    pay({
      amount,
      customerPhone: "9876543210",
      customerName: "Acme Customer",
      customerEmail: "customer@example.com",
      orderNote: "Order Payment",
      metadata: {
        customer_ref: "CUST_123",
        notes: "Checkout session",
      },
      onSuccess: () => alert("Payment complete! Your order is confirmed."),
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
        {loading ? "Opening Checkout..." : \`Pay Now (₹\${amount})\`}
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
                    <strong className="text-white">Zero-Backend Mode:</strong> Connect your React SPA without setting up Supabase Edge Functions. The React SDK queries Payment Hub's <code className="text-blue-400">/orders/:id/status</code> endpoint directly on demand.
                  </div>
                  <CodeBlock
                    title="1. Configure React Environment (.env)"
                    filePath=".env"
                    code={`# Central Payment Hub Client Configuration\nVITE_PAYMENT_HUB_URL="https://acepaymenthub.netlify.app/api/v1"\nVITE_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"`}
                  />
                  <CodeBlock
                    title="2. Check Order Status from React using Universal SDK"
                    filePath="src/lib/orderStatus.ts"
                    code={`import { PaymentHubClient } from "@/lib/paymentHubClient";

const client = new PaymentHubClient({
  hubUrl: import.meta.env.VITE_PAYMENT_HUB_URL,
  clientId: import.meta.env.VITE_PAYMENT_HUB_CLIENT_ID,
});

export async function isOrderPaid(orderId: string): Promise<boolean> {
  const status = await client.getOrderStatus(orderId);
  return status.order_status === "PAID";
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
                  code={`# Central Payment Hub Client Configuration\nVITE_PAYMENT_HUB_URL="https://acepaymenthub.netlify.app/api/v1"\nVITE_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"`}
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

    const hubUrl = import.meta.env.VITE_PAYMENT_HUB_URL || "https://acepaymenthub.netlify.app/api/v1";
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
                    code={`NEXT_PUBLIC_PAYMENT_HUB_URL="https://acepaymenthub.netlify.app/api/v1"\nNEXT_PUBLIC_PAYMENT_HUB_CLIENT_ID="<YOUR_PUBLIC_CLIENT_ID>"`}
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

    const hubUrl = process.env.NEXT_PUBLIC_PAYMENT_HUB_URL || "https://acepaymenthub.netlify.app/api/v1";
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
                      code={`# Client-accessible URL\nNEXT_PUBLIC_PAYMENT_HUB_URL="https://acepaymenthub.netlify.app/api/v1"\n\n# Server-only credentials (Never exposed to browser)\nPAYMENT_HUB_CLIENT_ID="pub_live_nextapp_xxxx"\nPAYMENT_HUB_CLIENT_SECRET="sec_live_nextapp_xxxx"\nPAYMENT_HUB_WEBHOOK_SECRET="whsec_nextapp_xxxx"`}
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
                  Execute this SQL in your tenant app's database. It creates standard order tables and a trigger that auto-fulfills orders upon verified payments.
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
          {/* 11. ORDER LIFECYCLE & VERIFICATION */}
          {/* =============================================================== */}
          {(activeSection === "order-lifecycle" || activeSection === "entitlements" || activeSection === "expiration") && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>Order Lifecycle & APIs</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Order Status</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Order Lifecycle & Real-Time Status Verification</h2>
                <p className="text-xs text-slate-400">
                  Track and verify order transitions in your tenant applications (CREATED → ACTIVE → PAID / EXPIRED) with high-speed polling or realtime webhooks.
                </p>
              </div>

              <CodeBlock
                title="Order Status Verification (GET /api/v1/orders/:orderId/status)"
                code={`// Example Request:
GET /api/v1/orders/ORD_1795521976057/status HTTP/1.1
Host: localhost:3000
x-client-id: pub_live_payroll_d42a8b9e...

// Example Response (200 OK):
{
  "success": true,
  "order_id": "ORD_1795521976057",
  "order_status": "PAID",
  "order_amount": 2359.00,
  "order_currency": "INR",
  "payment_id": "CF_PAY_987654321",
  "payment_status": "SUCCESS",
  "payment_time": "2026-11-25T11:30:00Z"
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
                  Client endpoints require <code className="text-blue-400">x-client-id</code>; listing orders also needs <code className="text-blue-400">x-client-secret</code> (server-side only). Admin endpoints (apps, settings, outbox, refunds, reconciliation) require <code className="text-blue-400">Authorization: Bearer &lt;ADMIN_API_KEY&gt;</code>.
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
                      <td className="p-3 font-sans text-slate-300">Poll payment status (PAID / ACTIVE / FAILED / EXPIRED)</td>
                      <td className="p-3 text-blue-400">x-client-id</td>
                    </tr>
                    <tr>
                      <td className="p-3"><span className="text-amber-400 font-bold">POST</span></td>
                      <td className="p-3 text-white">/api/v1/orders/:orderId/cancel</td>
                      <td className="p-3 font-sans text-slate-300">Cancel an active unpaid order</td>
                      <td className="p-3 text-blue-400">x-client-id</td>
                    </tr>
                    <tr>
                      <td className="p-3"><span className="text-blue-400 font-bold">GET</span></td>
                      <td className="p-3 text-white">/api/v1/orders</td>
                      <td className="p-3 font-sans text-slate-300">List tenant application orders</td>
                      <td className="p-3 text-blue-400">x-client-id + secret</td>
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
          {/* 13B. CASHFREE 1-2S POPUP SPEED OPTIMIZATION */}
          {/* =============================================================== */}
          {activeSection === "performance-optimization" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  <span>Performance</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Popup Speed Optimization</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">How to Reduce Cashfree Popup Load Time to ~1–2 Seconds</h2>
                <p className="text-xs text-slate-400">
                  Pre-resolve DNS lookups, pre-warm TLS handshakes, and preload Cashfree SDK assets on app startup so clicking the pay button renders the Cashfree checkout modal instantly.
                </p>
              </div>

              {/* Step 1: Preconnect & Prefetch */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <h3 className="font-bold text-sm text-slate-100">
                    Add DNS Preconnect & Prefetch in your Client App&apos;s index.html / head
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Add this block inside the <code className="text-blue-300">&lt;head&gt;</code> tag of your application (e.g. <code className="text-slate-300">index.html</code> in Vite or <code className="text-slate-300">app/layout.tsx</code> in Next.js). This eliminates ~2–3 seconds of TLS connection latency before the user even clicks pay:
                </p>
                <CodeBlock
                  title="HTML Head Preconnect & Prefetch Snippet"
                  language="html"
                  code={`<!-- Cashfree Fast Preconnect & DNS Prefetch (<1-2s popup response) -->
<link rel="preconnect" href="https://sdk.cashfree.com" crossorigin />
<link rel="preconnect" href="https://payments.cashfree.com" crossorigin />
<link rel="preconnect" href="https://api.cashfree.com" crossorigin />
<link rel="preconnect" href="https://sandbox.cashfree.com" crossorigin />

<link rel="dns-prefetch" href="https://sdk.cashfree.com" />
<link rel="dns-prefetch" href="https://payments.cashfree.com" />
<link rel="dns-prefetch" href="https://api.cashfree.com" />
<link rel="dns-prefetch" href="https://sandbox.cashfree.com" />

<!-- Preload Cashfree JS SDK in browser memory -->
<link rel="preload" href="https://sdk.cashfree.com/js/v3/cashfree.js" as="script" />`}
                />
              </div>

              {/* Step 2: Pre-initialize SDK */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-bold text-sm text-slate-100">
                    Pre-initialize the SDK on Page Mount (Zero Delay on Button Click)
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Instead of awaiting SDK script downloads inside the button click handler, initialize the Cashfree SDK instance on page mount so it is warm in memory:
                </p>
                <CodeBlock
                  title="Instant Popup Execution (usePaymentHub.ts / CheckoutButton.tsx)"
                  language="typescript"
                  code={`import { load } from "@cashfreepayments/cashfree-js";

// 1. Pre-warm Cashfree instance on component mount
useEffect(() => {
  load({ mode: "production" }); // or "sandbox"
}, []);

// 2. When user clicks "Pay Now":
async function handlePayClick() {
  // A. Create order session through Central Payment Hub
  const order = await paymentHubClient.checkout({ amount: 1500, customerPhone: "9876543210" });
  
  // B. Instantly launch modal in under 1 second!
  const cashfree = await load({ mode: order.mode || "production" });
  await cashfree.checkout({
    paymentSessionId: order.payment_session_id,
    redirectTarget: "_modal",
  });
}`}
                />
              </div>

              {/* AI Prompt Snippet */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    3
                  </div>
                  <h3 className="font-bold text-sm text-slate-100">
                    AI Assistant Prompt (Copy & Paste to your AI Agent or Cursor)
                  </h3>
                </div>
                <CodeBlock
                  title="Prompt for Ultra-Fast Cashfree Popup"
                  language="text"
                  code={`Optimize Cashfree checkout popup load time to under 1–2 seconds by adding DNS prefetch and preconnect tags for https://sdk.cashfree.com, https://payments.cashfree.com, and https://api.cashfree.com in index.html. Pre-load the Cashfree v3 JS SDK with defer/preload, and pre-initialize const cashfree = await load({ mode }) on page mount so that clicking the Pay button immediately opens the modal without waiting for script downloads or DNS handshakes.`}
                />
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* 14. AI PROMPT TOOLS */}
          {/* =============================================================== */}
          {(activeSection === "ai-prompt-react" || activeSection === "ai-prompt-nextjs") && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  <span>AI Tools</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Auto-Integration Prompts</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-2xl font-extrabold text-white">One-Shot AI Coding Assistant Prompts</h2>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Domain: {currentOrigin}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Copy and paste directly into Cursor, Antigravity, Copilot, or Claude Code. The guide URL (<code className="text-blue-300">{currentOrigin}/guide</code>) and API endpoint (<code className="text-blue-300">{currentOrigin}/api/v1</code>) are automatically attached based on your current domain.
                </p>
              </div>

              <CodeBlock
                title="One-Shot React Auto-Integration Prompt"
                code={reactAiPrompt}
              />

              <CodeBlock
                title="One-Shot Next.js Auto-Integration Prompt"
                code={nextjsAiPrompt}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
