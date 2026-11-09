"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { Layers, Plus, Key, Copy, Check, Shield } from "lucide-react";

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form states
  const [appCode, setAppCode] = useState("");
  const [appName, setAppName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [newCredentials, setNewCredentials] = useState<any | null>(null);

  useEffect(() => {
    fetchApps();
  }, []);

  async function fetchApps() {
    setLoading(true);
    try {
      // In production, passes admin API key from session/cookie or header
      const res = await fetch("/api/v1/apps", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY || "admin_secret_hub_master_key_change_me"}` },
      });
      const data = await res.json();
      if (data.apps) setApps(data.apps);
    } catch (err) {
      console.error("Failed to load apps", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateApp(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY || "admin_secret_hub_master_key_change_me"}`,
        },
        body: JSON.stringify({ appCode, appName, webhookUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCredentials(data.app);
        fetchApps();
        setAppCode("");
        setAppName("");
        setWebhookUrl("");
      } else {
        alert(data.error || "Failed to create application");
      }
    } catch (err: any) {
      alert(err.message || "Error creating application");
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <>
      <Header title="Applications Registry (Multi-tenant Hub)" />

      {/* Overview & Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--foreground)]">Registered Tenant Applications</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Manage credentials, allowed origins, and webhook callback URLs for your 20 connected applications.
          </p>
        </div>
        <button
          onClick={() => {
            setNewCredentials(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-[var(--muted-foreground)]">
            Loading tenant applications...
          </div>
        ) : apps.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-[var(--muted-foreground)] border border-dashed border-[var(--border)] rounded-xl">
            No applications registered yet. Click &quot;Add Application&quot; to onboard APP001 or Website 01.
          </div>
        ) : (
          apps.map((app) => (
            <div
              key={app.id}
              className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 mb-1">
                    {app.appCode}
                  </div>
                  <h3 className="font-bold text-sm text-[var(--foreground)]">{app.appName}</h3>
                </div>
                <Badge variant={app.isActive ? "success" : "neutral"}>
                  {app.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[var(--muted-foreground)] block">Client ID:</span>
                  <div className="flex items-center justify-between font-mono p-1.5 rounded bg-[var(--background)] border border-[var(--border)] mt-0.5">
                    <span className="truncate pr-2">{app.clientId}</span>
                    <button
                      onClick={() => copyToClipboard(app.clientId, app.id + "-client")}
                      className="text-[var(--muted-foreground)] hover:text-white"
                    >
                      {copiedKey === app.id + "-client" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[var(--muted-foreground)] block">Webhook Destination:</span>
                  <p className="font-mono text-[11px] text-[var(--foreground)] truncate mt-0.5">
                    {app.webhookUrl || "No webhook URL configured"}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>Orders: {app._count?.orders || 0}</span>
                <span>Deliveries: {app._count?.outboxDeliveries || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal to Register App */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--foreground)]">
                {newCredentials ? "Application Credentials Created" : "Onboard New Application"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-[var(--muted-foreground)] hover:text-white"
              >
                ✕
              </button>
            </div>

            {newCredentials ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  <Shield className="w-4 h-4 inline mr-1" />
                  <strong>Important:</strong> Save these credentials now. The Client Secret is hashed and cannot be viewed again.
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--muted-foreground)]">Client ID:</span>
                    <div className="flex items-center justify-between font-mono p-2 rounded bg-[var(--background)] border border-[var(--border)] mt-1">
                      <span>{newCredentials.clientId}</span>
                      <button onClick={() => copyToClipboard(newCredentials.clientId, "new-id")}>
                        {copiedKey === "new-id" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[var(--muted-foreground)]">Client Secret:</span>
                    <div className="flex items-center justify-between font-mono p-2 rounded bg-[var(--background)] border border-[var(--border)] mt-1 text-amber-300 font-bold">
                      <span className="truncate pr-2">{newCredentials.clientSecret}</span>
                      <button onClick={() => copyToClipboard(newCredentials.clientSecret, "new-sec")}>
                        {copiedKey === "new-sec" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[var(--muted-foreground)]">Webhook Signing Secret:</span>
                    <div className="flex items-center justify-between font-mono p-2 rounded bg-[var(--background)] border border-[var(--border)] mt-1">
                      <span className="truncate pr-2">{newCredentials.webhookSecret}</span>
                      <button onClick={() => copyToClipboard(newCredentials.webhookSecret, "new-wh")}>
                        {copiedKey === "new-wh" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateApp} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1">
                    App Code (e.g. APP001, WEBSITE_02, ANDROID_APP)
                  </label>
                  <input
                    type="text"
                    required
                    value={appCode}
                    onChange={(e) => setAppCode(e.target.value.toUpperCase())}
                    placeholder="APP001"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1">
                    Application Name
                  </label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Mobile Store Android App"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1">
                    Webhook Destination URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://clientapp.com/api/payment-webhook"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                  >
                    Create & Generate Keys
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

