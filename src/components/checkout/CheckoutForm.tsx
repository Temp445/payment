"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

type Method = "upi" | "card" | "netbanking" | "wallet" | "paylater";

interface CheckoutInfo {
  mode: "sandbox" | "production";
  order: {
    order_id: string;
    amount: number;
    currency: string;
    status: string;
    note?: string | null;
    return_url?: string | null;
  };
  brand: { name: string; logo_url?: string | null; color: string };
}

declare global {
  interface Window {
    Cashfree?: (opts: { mode: string }) => any;
  }
}

const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;
    if (window.Cashfree) return resolve();
    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load payment SDK"));
    document.body.appendChild(s);
  });
}

const METHODS: { id: Method; label: string }[] = [
  { id: "upi", label: "UPI" },
  { id: "card", label: "Card" },
  { id: "netbanking", label: "Net Banking" },
  { id: "wallet", label: "Wallets" },
  { id: "paylater", label: "Pay Later" },
];

/**
 * Branded custom checkout. Card/UPI inputs are Cashfree-hosted secure fields
 * (iframes) so raw card data never touches Payment Hub servers.
 */
export default function CheckoutForm({
  session,
  hubBase = "",
}: {
  session: string;
  hubBase?: string;
}) {
  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("upi");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"PAID" | "FAILED" | null>(null);
  const cf = useRef<any>(null);
  const comps = useRef<Record<string, any>>({});
  const mounted = useRef(false);

  const fetchInfo = useCallback(async () => {
    const res = await fetch(`${hubBase}/api/v1/checkout/${encodeURIComponent(session)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Unable to load checkout");
    return data as CheckoutInfo & { success: boolean };
  }, [session, hubBase]);

  // Load order info + SDK
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchInfo();
        setInfo(data);
        if (data.order.status === "PAID") setResult("PAID");
        await loadSdk();
        cf.current = window.Cashfree!({ mode: data.mode });
        // trigger mount effect
        setInfo({ ...data });
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [fetchInfo]);

  // Mount secure components once SDK + info ready
  useEffect(() => {
    if (!info || !cf.current || mounted.current || result) return;
    mounted.current = true;
    const make = (name: string, selector: string, values: any = {}) => {
      try {
        const c = cf.current.create(name, { values });
        c.mount(selector);
        comps.current[name] = c;
      } catch (e) {
        console.warn("Component not available:", name, e);
      }
    };
    make("upiCollect", "#cf-upi", { upiId: "" });
    make("cardNumber", "#cf-card-number", { placeholder: "Card number" });
    make("cardHolder", "#cf-card-holder", { placeholder: "Name on card" });
    make("cardExpiry", "#cf-card-expiry", { placeholder: "MM/YY" });
    make("cardCvv", "#cf-card-cvv", { placeholder: "CVV" });
    make("netbanking", "#cf-netbanking");
    make("wallet", "#cf-wallet");
    make("paylater", "#cf-paylater");
  }, [info, result]);

  const pollUntilDone = useCallback(async () => {
    for (let i = 0; i < 40; i++) {
      const d = await fetchInfo();
      if (d.order.status === "PAID") return "PAID" as const;
      if (["FAILED", "CANCELLED", "EXPIRED"].includes(d.order.status)) return "FAILED" as const;
      await new Promise((r) => setTimeout(r, 3000));
    }
    return "FAILED" as const;
  }, [fetchInfo]);

  const pay = async () => {
    if (!cf.current || !info) return;
    setBusy(true);
    setError(null);
    try {
      const componentName: Record<Method, string> = {
        upi: "upiCollect",
        card: "cardNumber",
        netbanking: "netbanking",
        wallet: "wallet",
        paylater: "paylater",
      };
      const paymentMethod = comps.current[componentName[method]];
      if (!paymentMethod) throw new Error("This payment method is not available on your account yet.");

      const res = await cf.current.pay({
        paymentMethod,
        paymentSessionId: session,
        returnUrl: window.location.href,
        redirect: "if_required",
      });

      if (res?.error) throw new Error(res.error.message || "Payment failed");

      const final = await pollUntilDone();
      setResult(final);
      if (final === "PAID" && info.order.return_url) {
        const u = new URL(info.order.return_url);
        u.searchParams.set("order_id", info.order.order_id);
        setTimeout(() => (window.location.href = u.toString()), 2500);
      }
    } catch (e: any) {
      setError(e.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  if (error && !info) {
    return <Shell><p className="p-6 text-center text-red-600 text-sm">{error}</p></Shell>;
  }
  if (!info) {
    return <Shell><p className="p-6 text-center text-slate-500 text-sm">Loading secure checkout…</p></Shell>;
  }

  const color = info.brand.color;
  const amount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: info.order.currency || "INR",
  }).format(info.order.amount);

  return (
    <Shell>
      <div className="px-6 py-5 text-white" style={{ background: color }}>
        <div className="flex items-center gap-3">
          {info.brand.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.brand.logo_url} alt="" className="w-10 h-10 rounded-lg bg-white object-contain p-1" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold">
              {info.brand.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold leading-tight">{info.brand.name}</div>
            {info.order.note && <div className="text-xs opacity-80">{info.order.note}</div>}
          </div>
        </div>
        <div className="mt-4 text-3xl font-bold">{amount}</div>
        <div className="text-xs opacity-80">Order {info.order.order_id}</div>
      </div>

      {result === "PAID" ? (
        <div className="p-8 text-center space-y-2">
          <div className="text-4xl">✅</div>
          <div className="font-semibold text-slate-900">Payment successful</div>
          <p className="text-sm text-slate-500">
            {info.order.return_url ? "Redirecting you back…" : "You can close this window."}
          </p>
        </div>
      ) : result === "FAILED" ? (
        <div className="p-8 text-center space-y-3">
          <div className="text-4xl">❌</div>
          <div className="font-semibold text-slate-900">Payment failed or expired</div>
          <p className="text-sm text-slate-500">Please go back and start a new payment.</p>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className="px-3 py-1.5 rounded-full text-sm border transition"
                style={
                  method === m.id
                    ? { background: color, borderColor: color, color: "#fff" }
                    : { borderColor: "#cbd5e1", color: "#334155" }
                }
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className={method === "upi" ? "" : "hidden"}>
            <label className="text-xs text-slate-500">UPI ID</label>
            <div id="cf-upi" className="mt-1" />
          </div>
          <div className={method === "card" ? "space-y-3" : "hidden"}>
            <div id="cf-card-number" />
            <div id="cf-card-holder" />
            <div className="grid grid-cols-2 gap-3">
              <div id="cf-card-expiry" />
              <div id="cf-card-cvv" />
            </div>
          </div>
          <div className={method === "netbanking" ? "" : "hidden"}><div id="cf-netbanking" /></div>
          <div className={method === "wallet" ? "" : "hidden"}><div id="cf-wallet" /></div>
          <div className={method === "paylater" ? "" : "hidden"}><div id="cf-paylater" /></div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={pay}
            disabled={busy}
            className="w-full py-3 rounded-lg text-white font-semibold disabled:opacity-60"
            style={{ background: color }}
          >
            {busy ? "Processing…" : `Pay ${amount}`}
          </button>
          <p className="text-center text-[11px] text-slate-400">
            🔒 Payments are encrypted. Card details are never stored by {info.brand.name}.
          </p>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden text-slate-900">
        {children}
      </div>
    </div>
  );
}

