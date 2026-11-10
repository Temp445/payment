"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import {
  Settings,
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
} from "lucide-react";

export default function SettingsPage() {
  const [hubUrl, setHubUrl] = useState("");
  const [adminApiKey, setAdminApiKey] = useState("");
  const [cashfreeEnv, setCashfreeEnv] = useState<"TEST" | "PRODUCTION">("TEST");
  const [cashfreeAppId, setCashfreeAppId] = useState("");
  const [cashfreeSecretKey, setCashfreeSecretKey] = useState("");
  const [cashfreeApiVersion, setCashfreeApiVersion] = useState("2023-08-01");

  const [showAdminKey, setShowAdminKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [connMsg, setConnMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const authHeader = `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY || "admin_secret_hub_master_key_change_me"}`;

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    setStatusMsg(null);
    setConnMsg(null);
    try {
      const res = await fetch("/api/v1/settings", {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setHubUrl(data.settings.hubUrl || "");
        setAdminApiKey(data.settings.adminApiKey || "");
        setCashfreeEnv(data.settings.cashfreeEnv === "PRODUCTION" ? "PRODUCTION" : "TEST");
        setCashfreeAppId(data.settings.cashfreeAppId || "");
        setCashfreeSecretKey(data.settings.cashfreeSecretKey || "");
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
          Authorization: authHeader,
        },
        body: JSON.stringify({
          hubUrl: hubUrl.trim(),
          adminApiKey: adminApiKey.trim(),
          cashfreeEnv,
          cashfreeAppId: cashfreeAppId.trim(),
          cashfreeSecretKey: cashfreeSecretKey.trim(),
          cashfreeApiVersion: cashfreeApiVersion.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: "success",
          text: "Settings successfully saved to database! Cashfree credentials and Hub URLs updated live.",
        });
        if (data.settings) {
          setHubUrl(data.settings.hubUrl);
          setAdminApiKey(data.settings.adminApiKey);
          setCashfreeEnv(data.settings.cashfreeEnv === "PRODUCTION" ? "PRODUCTION" : "TEST");
          setCashfreeAppId(data.settings.cashfreeAppId);
          setCashfreeSecretKey(data.settings.cashfreeSecretKey);
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

  async function handleTestConnection() {
    setTestingConn(true);
    setConnMsg(null);
    try {
      const res = await fetch("/api/v1/settings?test_connection=true", {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      if (data.success && data.connectionStatus === "CONNECTED") {
        setConnMsg({
          type: "success",
          text: "✅ Cashfree gateway connection verified successfully! Credentials are active and valid.",
        });
      } else {
        setConnMsg({
          type: "error",
          text: `❌ ${data.error || "Connection test failed. Please verify your App ID and Secret Key."}`,
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
    <div className="flex-1 min-h-screen bg-[var(--background)] flex flex-col">
      <Header title="System & Dynamic Runtime Settings" />

      <main className="flex-1 p-6 max-w-4xl w-full mx-auto space-y-6">
        {/* Banner */}
        <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-start gap-3">
          <Database className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <h3 className="font-semibold text-blue-200">Database-Backed Dynamic Configuration</h3>
            <p className="text-slate-300 leading-relaxed">
              All credentials and URLs configured here are saved directly to your database (<code className="text-blue-300">payment_hub_config</code>).
              You can switch between <strong>Cashfree Sandbox and Production</strong>, change App IDs, update Secret Keys, or manage multi-port URLs live without editing <code className="text-blue-300">.env</code> files or restarting your server.
            </p>
          </div>
        </div>

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
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-xs text-[var(--muted-foreground)] flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              Loading configuration from database...
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6 text-xs">
              {/* SECTION 1: CASHFREE GATEWAY CREDENTIALS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-[var(--foreground)]">
                      Cashfree Payment Gateway Credentials
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConn || !cashfreeAppId || !cashfreeSecretKey}
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
                        Test Connection
                      </>
                    )}
                  </button>
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

                {/* Environment Selector */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--foreground)]">
                    Gateway Environment (CASHFREE_ENV)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="cashfreeEnv"
                        value="TEST"
                        checked={cashfreeEnv === "TEST"}
                        onChange={() => setCashfreeEnv("TEST")}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span className="text-slate-200 font-medium">🧪 TEST / Sandbox</span>
                      <span className="text-[10px] text-slate-400">(sandbox.cashfree.com)</span>
                    </label>

                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="cashfreeEnv"
                        value="PRODUCTION"
                        checked={cashfreeEnv === "PRODUCTION"}
                        onChange={() => setCashfreeEnv("PRODUCTION")}
                        className="text-emerald-600 focus:ring-0"
                      />
                      <span className="text-slate-200 font-medium">🚀 PRODUCTION / Live</span>
                      <span className="text-[10px] text-slate-400">(api.cashfree.com)</span>
                    </label>
                  </div>
                </div>

                {/* App ID & API Version Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-semibold text-[var(--foreground)]">
                      Cashfree App ID (CASHFREE_APP_ID)
                    </label>
                    <input
                      type="text"
                      required
                      value={cashfreeAppId}
                      onChange={(e) => setCashfreeAppId(e.target.value)}
                      placeholder="e.g. TEST11326003a6f87f6f965fe030062311"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500 transition text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--foreground)]">
                      API Version
                    </label>
                    <input
                      type="text"
                      required
                      value={cashfreeApiVersion}
                      onChange={(e) => setCashfreeApiVersion(e.target.value)}
                      placeholder="2023-08-01"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500 transition text-xs"
                    />
                  </div>
                </div>

                {/* Secret Key */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--foreground)]">
                    Cashfree Secret Key (CASHFREE_SECRET_KEY)
                  </label>
                  <div className="relative">
                    <input
                      type={showSecretKey ? "text" : "password"}
                      required
                      value={cashfreeSecretKey}
                      onChange={(e) => setCashfreeSecretKey(e.target.value)}
                      placeholder="cfsk_ma_test_..."
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500 transition text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Kept securely in database and used by the Central Hub to sign orders and verify Cashfree webhooks.
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
              <strong>Database Overrides .env</strong>: Any credentials saved here take immediate priority over <code className="text-slate-300">.env</code>. If fields are left empty, the system automatically falls back to your environment variables.
            </li>
            <li>
              <strong>Automatic Request Origin</strong>: When creating checkout sessions, the Payment Hub dynamically binds to whichever port or domain received the order (e.g. <code className="text-slate-300">3000</code> or <code className="text-slate-300">3002</code>).
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
