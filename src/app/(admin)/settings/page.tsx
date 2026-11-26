"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { EmailSettingsTab } from "@/components/settings/EmailSettingsTab";
import {
  Settings,
  Users,
  Globe,
  Key,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  Plus,
  CreditCard,
  ShieldCheck,
  Activity,
  Mail,
} from "lucide-react";

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "email" ? "email" : "gateway";
  const [activeTab, setActiveTab] = useState<"gateway" | "email">(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "email") {
      setActiveTab("email");
    } else if (tabParam === "gateway") {
      setActiveTab("gateway");
    }
  }, [searchParams]);
  const [hubUrl, setHubUrl] = useState("");
  const [adminApiKey, setAdminApiKey] = useState("");
  const [cashfreeEnv, setCashfreeEnv] = useState<"TEST" | "PRODUCTION">("TEST");
  
  // Test Credentials
  const [cashfreeTestAppId, setCashfreeTestAppId] = useState("");
  const [cashfreeTestSecretKey, setCashfreeTestSecretKey] = useState("");
  const [showTestSecretKey, setShowTestSecretKey] = useState(false);

  // Production Credentials
  const [cashfreeProdAppId, setCashfreeProdAppId] = useState("");
  const [cashfreeProdSecretKey, setCashfreeProdSecretKey] = useState("");
  const [showProdSecretKey, setShowProdSecretKey] = useState(false);

  const [cashfreeApiVersion, setCashfreeApiVersion] = useState("2023-08-01");

  const [showAdminKey, setShowAdminKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [connMsg, setConnMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    setStatusMsg(null);
    setConnMsg(null);
    try {
      const res = await fetch("/api/v1/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setHubUrl(data.settings.hubUrl || "");
        setAdminApiKey(data.settings.adminApiKey || "");
        setCashfreeEnv(data.settings.cashfreeEnv === "PRODUCTION" ? "PRODUCTION" : "TEST");
        
        // Populate test credentials (with fallback to legacy single key)
        setCashfreeTestAppId(data.settings.cashfreeTestAppId || data.settings.cashfreeAppId || "");
        setCashfreeTestSecretKey(data.settings.cashfreeTestSecretKey || data.settings.cashfreeSecretKey || "");
        
        // Populate prod credentials
        setCashfreeProdAppId(data.settings.cashfreeProdAppId || "");
        setCashfreeProdSecretKey(data.settings.cashfreeProdSecretKey || "");

        setCashfreeApiVersion(data.settings.cashfreeApiVersion || "2023-08-01");
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to load settings" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Network error loading settings" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    setConnMsg(null);

    try {
      const res = await fetch("/api/v1/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hubUrl: hubUrl.trim(),
          adminApiKey: adminApiKey.trim(),
          cashfreeEnv,
          cashfreeTestAppId: cashfreeTestAppId.trim(),
          cashfreeTestSecretKey: cashfreeTestSecretKey.trim(),
          cashfreeProdAppId: cashfreeProdAppId.trim(),
          cashfreeProdSecretKey: cashfreeProdSecretKey.trim(),
          cashfreeApiVersion: cashfreeApiVersion.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: "success",
          text: `Settings saved successfully! Gateway is operating in ${cashfreeEnv === "PRODUCTION" ? "🚀 PRODUCTION" : "🧪 TEST"} mode.`,
        });
        if (data.settings) {
          setHubUrl(data.settings.hubUrl);
          setAdminApiKey(data.settings.adminApiKey);
          setCashfreeEnv(data.settings.cashfreeEnv === "PRODUCTION" ? "PRODUCTION" : "TEST");
          setCashfreeTestAppId(data.settings.cashfreeTestAppId || "");
          setCashfreeTestSecretKey(data.settings.cashfreeTestSecretKey || "");
          setCashfreeProdAppId(data.settings.cashfreeProdAppId || "");
          setCashfreeProdSecretKey(data.settings.cashfreeProdSecretKey || "");
          setCashfreeApiVersion(data.settings.cashfreeApiVersion);
        }
      } else {
        const detailMsg = data.details?.fieldErrors
          ? Object.entries(data.details.fieldErrors)
              .map(([field, errs]) => `${field}: ${(errs as string[]).join(", ")}`)
              .join("; ")
          : "";
        setStatusMsg({
          type: "error",
          text: detailMsg ? `${data.error}: ${detailMsg}` : data.error || "Failed to save settings",
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection(targetEnv?: "TEST" | "PRODUCTION") {
    const envToTest = targetEnv || cashfreeEnv;
    setTestingConn(true);
    setConnMsg(null);
    try {
      const res = await fetch(`/api/v1/settings?test_connection=true&mode=${envToTest}`);
      const data = await res.json();
      if (data.success && data.connectionStatus === "CONNECTED") {
        setConnMsg({
          type: "success",
          text: `✅ ${envToTest} connection verified successfully! Credentials are active and valid.`,
        });
      } else {
        setConnMsg({
          type: "error",
          text: `❌ ${data.error || `Connection test failed for ${envToTest}. Please verify your App ID and Secret Key.`}`,
        });
      }
    } catch (err: any) {
      setConnMsg({
        type: "error",
        text: `❌ Connection error: ${err.message}`,
      });
    } finally {
      setTestingConn(false);
    }
  }

  function handleAppendUrl(newUrl: string) {
    const cleanNew = newUrl.trim().replace(/\/$/, "");
    const parts = hubUrl
      .split(/[,\n]+/)
      .map((s) => s.trim().replace(/\/$/, ""))
      .filter(Boolean);

    if (!parts.includes(cleanNew)) {
      parts.push(cleanNew);
      setHubUrl(parts.join(", "));
    }
  }

  function handleSetCurrentOrigin() {
    if (typeof window !== "undefined") {
      handleAppendUrl(window.location.origin);
    }
  }

  function handleGenerateKey() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
    let key = "admin_sec_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAdminApiKey(key);
  }

  return (
    <>
      <Header title="System & Dynamic Runtime Settings" />

      <div className="w-full space-y-4 sm:space-y-6">
        {/* Navigation Tabs under Settings */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("gateway")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "gateway"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Gateway & System Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "email"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Gateway (SMTP)</span>
          </button>

          <Link
            href="/settings/users"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800/60 transition"
          >
            <Users className="w-4 h-4" />
            <span>Users & Access Control</span>
          </Link>
        </div>

        {activeTab === "email" ? (
          <EmailSettingsTab />
        ) : (
          <>
            {/* Banner */}
            {/* <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-xs space-y-1">
                <h3 className="font-semibold text-blue-200">Database-Backed Dynamic Configuration</h3>
                <p className="text-slate-300 leading-relaxed">
                  All credentials and URLs configured here are saved directly to your database (<code className="text-blue-300">payment_hub_config</code>).
                  You can switch between <strong>Cashfree Sandbox and Production</strong>, change App IDs, update Secret Keys, or manage multi-port URLs live without editing <code className="text-blue-300">.env</code> files or restarting your server.
                </p>
              </div>
            </div> */}

            {statusMsg && (
              <div
                className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
                  statusMsg.type === "success"
                    ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-200"
                    : "bg-red-950/40 border-red-800/50 text-red-200"
                }`}
              >
                {statusMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* Settings Form */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 shadow-sm">
              {loading ? (
                <div className="py-12 text-center text-xs text-[var(--muted-foreground)] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  Loading configuration from database...
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-6 text-xs">
                  {/* SECTION 1: CASHFREE GATEWAY & ENVIRONMENT MODE SWITCH */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border)] gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        <div>
                          <h3 className="font-bold text-sm text-[var(--foreground)]">
                            Cashfree Payment Gateway Credentials
                          </h3>
                          <p className="text-[11px] text-[var(--muted-foreground)]">
                            Both Sandbox and Production credentials are saved together. Switch modes anytime without re-typing keys.
                          </p>
                        </div>
                      </div>

                      {/* Active Environment Badge & Quick Connection Test */}
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          cashfreeEnv === "PRODUCTION"
                            ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/60"
                            : "bg-blue-950/60 text-blue-300 border-blue-700/60"
                        }`}>
                          Active Mode: {cashfreeEnv === "PRODUCTION" ? "🚀 Live Production" : "🧪 Sandbox Test"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTestConnection()}
                          disabled={
                            testingConn ||
                            (cashfreeEnv === "PRODUCTION"
                              ? !cashfreeProdAppId || !cashfreeProdSecretKey
                              : !cashfreeTestAppId || !cashfreeTestSecretKey)
                          }
                          className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                        >
                          {testingConn ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Activity className="w-3 h-3" />
                              Test Active Mode
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {connMsg && (
                      <div
                        className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                          connMsg.type === "success"
                            ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                            : "bg-rose-950/40 border-rose-800 text-rose-300"
                        }`}
                      >
                        <span>{connMsg.text}</span>
                      </div>
                    )}

                    {/* Environment Mode Switcher */}
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Active Gateway Mode</span>
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Transactions will route through this mode&apos;s credentials
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setCashfreeEnv("TEST")}
                          className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
                            cashfreeEnv === "TEST"
                              ? "bg-blue-950/50 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50"
                              : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>🧪 Sandbox / Test Mode</span>
                              {cashfreeEnv === "TEST" && (
                                <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.2 rounded font-semibold">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              sandbox.cashfree.com/pg
                            </div>
                          </div>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            cashfreeEnv === "TEST" ? "border-blue-500 bg-blue-500" : "border-slate-600"
                          }`}>
                            {cashfreeEnv === "TEST" && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCashfreeEnv("PRODUCTION")}
                          className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
                            cashfreeEnv === "PRODUCTION"
                              ? "bg-emerald-950/50 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/50"
                              : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>🚀 Production / Live Mode</span>
                              {cashfreeEnv === "PRODUCTION" && (
                                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-semibold">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              api.cashfree.com/pg (Real Payments)
                            </div>
                          </div>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            cashfreeEnv === "PRODUCTION" ? "border-emerald-500 bg-emerald-500" : "border-slate-600"
                          }`}>
                            {cashfreeEnv === "PRODUCTION" && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* ACTIVE ENVIRONMENT CREDENTIALS PANEL */}
                    <div className="space-y-3">
                      {cashfreeEnv === "TEST" ? (
                        /* CARD: TEST / SANDBOX CREDENTIALS */
                        <div className="p-4 sm:p-5 rounded-xl border bg-slate-900/90 border-blue-500/60 shadow-md ring-1 ring-blue-500/20 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-white flex items-center gap-2">
                                🧪 Sandbox / Test Credentials
                              </span>
                              {/* <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded font-mono font-semibold">
                                LIVE IN EFFECT
                              </span> */}
                            </div>
                            {/* <button
                              type="button"
                              onClick={() => handleTestConnection("TEST")}
                              disabled={testingConn || !cashfreeTestAppId || !cashfreeTestSecretKey}
                              className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-blue-900/40 hover:bg-blue-900/70 text-blue-200 border border-blue-700/50 transition disabled:opacity-40 flex items-center gap-1.5 self-start sm:self-auto"
                            >
                              <Activity className="w-3.5 h-3.5 text-blue-400" />
                              Verify Test Credentials
                            </button> */}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="font-semibold text-slate-200 text-xs">
                                Test App ID (Sandbox)
                              </label>
                              <input
                                type="text"
                                value={cashfreeTestAppId}
                                onChange={(e) => setCashfreeTestAppId(e.target.value)}
                                placeholder="e.g. TEST11326003a6f87f6f965fe030062311"
                                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500 transition text-xs"
                              />
                              <p className="text-[10px] text-slate-400">
                                Obtained from Cashfree Merchant Dashboard &gt; Developers &gt; API Keys (Test).
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <label className="font-semibold text-slate-200 text-xs">
                                Test Secret Key (Sandbox)
                              </label>
                              <div className="relative">
                                <input
                                  type={showTestSecretKey ? "text" : "password"}
                                  value={cashfreeTestSecretKey}
                                  onChange={(e) => setCashfreeTestSecretKey(e.target.value)}
                                  placeholder="cfsk_ma_test_..."
                                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500 transition text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowTestSecretKey(!showTestSecretKey)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                >
                                  {showTestSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Kept securely in database and used by the hub to sign orders in Sandbox mode.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* CARD: PRODUCTION / LIVE CREDENTIALS */
                        <div className="p-4 sm:p-5 rounded-xl border bg-slate-900/90 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/20 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-white flex items-center gap-2">
                                🚀 Production / Live Credentials
                              </span>
                              {/* <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-semibold">
                                LIVE IN EFFECT
                              </span> */}
                            </div>
                            {/* <button
                              type="button"
                              onClick={() => handleTestConnection("PRODUCTION")}
                              disabled={testingConn || !cashfreeProdAppId || !cashfreeProdSecretKey}
                              className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-200 border border-emerald-700/50 transition disabled:opacity-40 flex items-center gap-1.5 self-start sm:self-auto"
                            >
                              <Activity className="w-3.5 h-3.5 text-emerald-400" />
                              Verify Live Credentials
                            </button> */}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="font-semibold text-slate-200 text-xs">
                                Production App ID (Live)
                              </label>
                              <input
                                type="text"
                                value={cashfreeProdAppId}
                                onChange={(e) => setCashfreeProdAppId(e.target.value)}
                                placeholder="e.g. 11326003a6f87f6f965fe030062311"
                                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-emerald-500 transition text-xs"
                              />
                              <p className="text-[10px] text-slate-400">
                                Obtained from Cashfree Merchant Dashboard &gt; Developers &gt; API Keys (Production).
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <label className="font-semibold text-slate-200 text-xs">
                                Production Secret Key (Live)
                              </label>
                              <div className="relative">
                                <input
                                  type={showProdSecretKey ? "text" : "password"}
                                  value={cashfreeProdSecretKey}
                                  onChange={(e) => setCashfreeProdSecretKey(e.target.value)}
                                  placeholder="cfsk_ma_prod_..."
                                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-emerald-500 transition text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowProdSecretKey(!showProdSecretKey)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                >
                                  {showProdSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Stored securely in database and used by the hub for processing real customer payments.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Shared API Version */}
                    <div className="space-y-1 max-w-xs">
                      <label className="font-semibold text-[var(--foreground)]">
                        Cashfree API Version
                      </label>
                      <input
                        type="text"
                        required
                        list="cashfree-api-versions"
                        pattern="\d{4}-\d{2}-\d{2}"
                        value={cashfreeApiVersion}
                        onChange={(e) => setCashfreeApiVersion(e.target.value)}
                        placeholder="2025-01-01"
                        className="w-full px-3.5 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500 transition text-xs"
                      />
                      <datalist id="cashfree-api-versions">
                        <option value="2026-01-01">2026-01-01</option>
                        <option value="2025-01-01">2025-01-01</option>
                        <option value="2023-08-01">2023-08-01</option>
                        <option value="2022-09-01">2022-09-01</option>
                      </datalist>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Supports all Cashfree PG versions (<code className="text-slate-300">2022-09-01</code>, <code className="text-slate-300">2023-08-01</code>, <code className="text-slate-300">2025-01-01</code>, <code className="text-slate-300">2026-01-01</code>, or any <code className="text-slate-300">YYYY-MM-DD</code>).
                      </p>
                    </div>
                  </div>

                  {/* SECTION 2: HUB PUBLIC BASE URLS */}
                  <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-blue-400" />
                        Payment Hub Public Base URL(s)
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAppendUrl("http://localhost:3000")}
                          className="text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:border-blue-500 text-slate-300 transition flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-blue-400" /> :3000
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAppendUrl("http://localhost:3002")}
                          className="text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:border-blue-500 text-slate-300 transition flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-blue-400" /> :3002
                        </button>
                        <button
                          type="button"
                          onClick={handleSetCurrentOrigin}
                          className="text-[11px] px-2 py-0.5 rounded bg-blue-900/40 border border-blue-700/60 hover:bg-blue-900/60 text-blue-200 transition flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-blue-400" /> Current Origin
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={hubUrl}
                      onChange={(e) => setHubUrl(e.target.value)}
                      placeholder="http://localhost:3000, http://localhost:3002, https://your-hub.netlify.app"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500 transition text-xs leading-relaxed"
                    />
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Separate multiple URLs with commas. Used by Supabase&apos;s <code className="text-slate-300">pg_net</code> database trigger to notify all running instances (e.g. port 3000 and 3002).
                    </p>
                  </div>

                  {/* SECTION 3: MASTER ADMIN API KEY */}
                  <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-amber-400" />
                        Master Admin API Key
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateKey}
                        className="text-[11px] text-amber-400 hover:text-amber-300 transition underline underline-offset-2 flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        Generate Random Key
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showAdminKey ? "text" : "password"}
                        required
                        minLength={8}
                        value={adminApiKey}
                        onChange={(e) => setAdminApiKey(e.target.value)}
                        placeholder="admin_secret_hub_master_key_..."
                        className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500 transition text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminKey(!showAdminKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Secures admin endpoints, manages tenant applications, and authenticates the automated Supabase worker call.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 flex items-center justify-between border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={fetchSettings}
                      disabled={saving}
                      className="px-3.5 py-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-white transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reload from DB
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving to Database...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Settings to Database
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Architecture Details */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-xs text-[var(--muted-foreground)] space-y-3">
              <h4 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Dynamic Multi-Gateway Architecture
              </h4>
              <ul className="list-disc list-inside space-y-1.5 pl-1 leading-relaxed">
                <li>
                  <strong>Instant Environment Switching</strong>: Toggle between <strong>TEST / Sandbox</strong> and <strong>PRODUCTION / Live</strong> without editing code or restarting servers.
                </li>
                <li>
                  <strong>Automatic Request Origin</strong>: When creating checkout sessions, the Payment Hub dynamically binds to whichever port or domain received the order (e.g. <code className="text-slate-300">3000</code> or <code className="text-slate-300">3002</code>).
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Header title="Gateway & System Settings" />}>
      <SettingsContent />
    </Suspense>
  );
}
