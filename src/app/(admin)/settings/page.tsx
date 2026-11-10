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
} from "lucide-react";

export default function SettingsPage() {
  const [hubUrl, setHubUrl] = useState("");
  const [adminApiKey, setAdminApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const authHeader = `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY || "admin_secret_hub_master_key_change_me"}`;

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/settings", {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setHubUrl(data.settings.hubUrl || "");
        setAdminApiKey(data.settings.adminApiKey || "");
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
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: "success",
          text: "Settings successfully saved to database! Multi-URL triggers and runtime updated.",
        });
        if (data.settings) {
          setHubUrl(data.settings.hubUrl);
          setAdminApiKey(data.settings.adminApiKey);
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
            <h3 className="font-semibold text-blue-200">Database-Backed Multi-URL Runtime Configuration</h3>
            <p className="text-slate-300 leading-relaxed">
              Values saved here are stored directly in your Supabase PostgreSQL table (<code className="text-blue-300">payment_hub_config</code>).
              You can list multiple URLs separated by commas (e.g. <code className="text-blue-300">http://localhost:3000, http://localhost:3002</code>).
              Supabase&apos;s real-time <code className="text-blue-300">pg_net</code> database trigger will dispatch events to all running URLs without requiring .env edits or redeployment.
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
              {/* Hub URL Field */}
              <div className="space-y-2">
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

              {/* Admin API Key Field */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
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
                    type={showKey ? "text" : "password"}
                    required
                    minLength={8}
                    value={adminApiKey}
                    onChange={(e) => setAdminApiKey(e.target.value)}
                    placeholder="admin_secret_hub_master_key_..."
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500 transition text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
            <Zap className="w-4 h-4 text-emerald-400" />
            Multi-URL & Multi-Port Auto-Routing
          </h4>
          <ul className="list-disc list-inside space-y-1.5 pl-1 leading-relaxed">
            <li>
              <strong>Automatic Request Origin</strong>: When a client creates an order on port <code className="text-slate-300">3002</code>, Cashfree&apos;s webhook automatically targets <code className="text-slate-300">http://localhost:3002/api/v1/webhooks/cashfree</code>. If on <code className="text-slate-300">3000</code>, it targets <code className="text-slate-300">3000</code>.
            </li>
            <li>
              <strong>Supabase Multi-Dispatch</strong>: When listing multiple comma-separated URLs in <code className="text-slate-300">payment_hub_config</code>, Supabase&apos;s trigger sends the event to all configured URLs. The currently running server processes the delivery, while inactive ports fail quietly without errors.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
