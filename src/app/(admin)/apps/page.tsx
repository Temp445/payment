"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import {
  Layers,
  Plus,
  Key,
  Copy,
  Check,
  Shield,
  BookOpen,
  ArrowRight,
  Pencil,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Power,
  ExternalLink,
} from "lucide-react";

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Creation Form states
  const [appCode, setAppCode] = useState("");
  const [appName, setAppName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [newCredentials, setNewCredentials] = useState<any | null>(null);

  // Edit Modal states
  const [editApp, setEditApp] = useState<any | null>(null);
  const [editAppName, setEditAppName] = useState("");
  const [editWebhookUrl, setEditWebhookUrl] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editRegenerateSecret, setEditRegenerateSecret] = useState(false);
  const [editRegenerateWebhookSecret, setEditRegenerateWebhookSecret] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editCredentialsResult, setEditCredentialsResult] = useState<any | null>(null);

  // Delete Modal states
  const [deleteApp, setDeleteApp] = useState<any | null>(null);
  const [deleteForceConfirm, setDeleteForceConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const authHeader = `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY || "admin_secret_hub_master_key_change_me"}`;

  useEffect(() => {
    fetchApps();
  }, []);

  async function fetchApps() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/apps", {
        headers: { Authorization: authHeader },
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
          Authorization: authHeader,
        },
        body: JSON.stringify({
          appCode: appCode.trim(),
          appName: appName.trim(),
          webhookUrl: webhookUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCredentials(data.app);
        fetchApps();
        setAppCode("");
        setAppName("");
        setWebhookUrl("");
      } else {
        const detailMsg = data.details?.fieldErrors
          ? Object.entries(data.details.fieldErrors)
              .map(([field, errs]) => `${field}: ${(errs as string[]).join(", ")}`)
              .join("; ")
          : "";
        alert(detailMsg ? `${data.error}: ${detailMsg}` : (data.error || "Failed to create application"));
      }
    } catch (err: any) {
      alert(err.message || "Error creating application");
    }
  }

  function openEditModal(app: any) {
    setEditApp(app);
    setEditAppName(app.appName);
    setEditWebhookUrl(app.webhookUrl || "");
    setEditIsActive(app.isActive);
    setEditRegenerateSecret(false);
    setEditRegenerateWebhookSecret(false);
    setEditCredentialsResult(null);
  }

  async function handleUpdateApp(e: React.FormEvent) {
    e.preventDefault();
    if (!editApp) return;

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/v1/apps/${editApp.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          appName: editAppName,
          webhookUrl: editWebhookUrl ? editWebhookUrl.trim() : null,
          isActive: editIsActive,
          regenerateSecret: editRegenerateSecret,
          regenerateWebhookSecret: editRegenerateWebhookSecret,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.app.clientSecret) {
          setEditCredentialsResult(data.app);
        } else {
          setEditApp(null);
        }
        fetchApps();
      } else {
        alert(data.error || "Failed to update application");
      }
    } catch (err: any) {
      alert(err.message || "Error updating application");
    } finally {
      setEditSubmitting(false);
    }
  }

  function openDeleteModal(app: any) {
    setDeleteApp(app);
    setDeleteForceConfirm(false);
    setDeleteError(null);
  }

  async function handleDeleteApp(force = false) {
    if (!deleteApp) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/v1/apps/${deleteApp.id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });

      const data = await res.json();
      if (data.success) {
        setDeleteApp(null);
        fetchApps();
      } else {
        setDeleteError(data.error || "Failed to delete application");
      }
    } catch (err: any) {
      setDeleteError(err.message || "Network error deleting application");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(app: any) {
    try {
      const res = await fetch(`/api/v1/apps/${app.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ isActive: !app.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        fetchApps();
      } else {
        alert(data.error || "Failed to toggle status");
      }
    } catch (err: any) {
      alert(err.message || "Error changing status");
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

      {/* Quick Setup Guide Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Connecting a React or Next.js Application?</h3>
            <p className="text-slate-400">
              View copy-paste code snippets for Pure React (Zero-Backend) or Next.js Full-Stack with Cashfree drop-in modals.
            </p>
          </div>
        </div>
        <Link
          href="/guide"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition text-xs shrink-0"
        >
          <span>View Integration Guides</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

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
              className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-4 hover:border-slate-600 transition"
            >
              {/* Header with App Code, Status, and Action Buttons */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 mb-1">
                    {app.appCode}
                  </div>
                  <h3 className="font-bold text-sm text-[var(--foreground)] leading-tight">{app.appName}</h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={app.isActive ? "success" : "neutral"}>
                    {app.isActive ? "Active" : "Inactive"}
                  </Badge>

                  {/* Edit Button */}
                  <button
                    onClick={() => openEditModal(app)}
                    title="Edit Application"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => openDeleteModal(app)}
                    title="Delete Application"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Client ID & Webhook */}
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
                  <p className="font-mono text-[11px] text-[var(--foreground)] truncate mt-0.5" title={app.webhookUrl || ""}>
                    {app.webhookUrl || "No webhook URL configured"}
                  </p>
                </div>
              </div>

              {/* Footer with Counters and Quick Actions */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <div className="flex items-center gap-3">
                  <span>Orders: <strong className="text-slate-200">{app._count?.orders || 0}</strong></span>
                  <span>Deliveries: <strong className="text-slate-200">{app._count?.outboxDeliveries || 0}</strong></span>
                </div>

                <button
                  onClick={() => handleToggleActive(app)}
                  className="text-[11px] text-slate-400 hover:text-blue-400 transition underline"
                >
                  {app.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTER NEW APP */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
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

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT APPLICATION */}
      {/* ========================================================================= */}
      {editApp && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-blue-400" />
                  Edit Application: {editApp.appCode}
                </h3>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Update settings, webhook URL, or rotate API credentials.
                </p>
              </div>
              <button
                onClick={() => setEditApp(null)}
                className="text-xs text-[var(--muted-foreground)] hover:text-white"
              >
                ✕
              </button>
            </div>

            {editCredentialsResult ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                  <p className="font-bold">⚠️ New Secret Generated!</p>
                  <p>Save this Client Secret now. Any backend services using the old secret must be updated.</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--muted-foreground)]">New Client Secret:</span>
                    <div className="flex items-center justify-between font-mono p-2 rounded bg-[var(--background)] border border-[var(--border)] mt-1 text-amber-300 font-bold">
                      <span className="truncate pr-2">{editCredentialsResult.clientSecret}</span>
                      <button onClick={() => copyToClipboard(editCredentialsResult.clientSecret, "edit-sec")}>
                        {copiedKey === "edit-sec" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setEditApp(null)}
                  className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                >
                  Close & Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateApp} className="space-y-4 text-xs">
                {/* App Code (Read-Only) */}
                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1">
                    App Code (Namespace identifier - permanent)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editApp.appCode}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-[var(--border)] text-slate-400 font-mono cursor-not-allowed"
                  />
                </div>

                {/* App Name */}
                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1 font-medium">
                    Application Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editAppName}
                    onChange={(e) => setEditAppName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Webhook URL */}
                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1 font-medium">
                    Webhook Destination URL
                  </label>
                  <input
                    type="url"
                    value={editWebhookUrl}
                    onChange={(e) => setEditWebhookUrl(e.target.value)}
                    placeholder="https://yourapp.com/api/payment-webhook"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                    Payment Hub will dispatch signed HMAC-SHA256 events to this address when orders are paid.
                  </p>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-[var(--border)]">
                  <div>
                    <span className="font-semibold text-slate-200 block">Application Active Status</span>
                    <span className="text-[11px] text-slate-400">
                      Inactive applications cannot create new orders or poll payment status.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(!editIsActive)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      editIsActive
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {editIsActive ? "Active" : "Inactive"}
                  </button>
                </div>

                {/* Key Rotation / Regeneration options */}
                <div className="p-3 rounded-lg bg-slate-900 border border-[var(--border)] space-y-2">
                  <span className="font-semibold text-slate-200 block">Security & Key Rotation</span>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRegenerateSecret}
                      onChange={(e) => setEditRegenerateSecret(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span className="text-slate-300">Regenerate Client Secret (sec_live_...)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRegenerateWebhookSecret}
                      onChange={(e) => setEditRegenerateWebhookSecret(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span className="text-slate-300">Regenerate Webhook Secret (whsec_...)</span>
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditApp(null)}
                    className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE APPLICATION CONFIRMATION */}
      {/* ========================================================================= */}
      {deleteApp && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-rose-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--foreground)]">Delete Application</h3>
                <p className="text-[11px] text-slate-400">{deleteApp.appName} ({deleteApp.appCode})</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {deleteError}
              </div>
            )}

            {deleteApp._count?.orders > 0 ? (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  ⚠️ <strong>Warning:</strong> This application has <strong>{deleteApp._count.orders} order(s)</strong> and <strong>{deleteApp._count.outboxDeliveries} webhook log(s)</strong> in the database.
                </div>

                <p className="text-slate-400">
                  Instead of deleting, you can <strong>Deactivate</strong> this application to block future orders while preserving financial transaction records.
                </p>

                <label className="flex items-start gap-2 pt-1 cursor-pointer bg-slate-900 p-2.5 rounded-lg border border-slate-700">
                  <input
                    type="checkbox"
                    checked={deleteForceConfirm}
                    onChange={(e) => setDeleteForceConfirm(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-rose-600 focus:ring-0"
                  />
                  <span className="text-[11px] text-rose-300 font-medium leading-relaxed">
                    I understand this will permanently delete all {deleteApp._count.orders} order records, payments, and outbox logs for this tenant.
                  </span>
                </label>
              </div>
            ) : (
              <p className="text-xs text-slate-300">
                Are you sure you want to delete <strong>{deleteApp.appName}</strong>? Its API keys will become invalid immediately. This action cannot be undone.
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteApp(null)}
                className="px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>

              {deleteApp._count?.orders > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleActive(deleteApp);
                      setDeleteApp(null);
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition"
                  >
                    Deactivate Instead
                  </button>

                  <button
                    type="button"
                    disabled={!deleteForceConfirm || deleting}
                    onClick={() => handleDeleteApp(true)}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-bold text-white transition"
                  >
                    {deleting ? "Deleting All..." : "Delete Permanently"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDeleteApp(false)}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition"
                >
                  {deleting ? "Deleting..." : "Delete Application"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
