"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Server,
  ShieldCheck,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Send,
  Activity,
  Check,
} from "lucide-react";

interface EmailSettingsData {
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpUseTls?: boolean;
  defaultFromEmail?: string;
  defaultFromName?: string;
}

export function EmailSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [senderName, setSenderName] = useState("Ace Payment Hub");
  const [senderEmail, setSenderEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpUseTls, setSmtpUseTls] = useState(true);

  // Quick test email input
  const [testRecipient, setTestRecipient] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);

  // Feedback states
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setStatusMsg(null);
    setTestResult(null);
    try {
      const res = await fetch("/api/v1/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setSenderName(data.settings.defaultFromName || "Ace Payment Hub");
        setSenderEmail(data.settings.defaultFromEmail || "");
        setSmtpHost(data.settings.smtpHost || "");
        setSmtpPort(Number(data.settings.smtpPort) || 465);
        setSmtpUsername(data.settings.smtpUsername || "");
        setSmtpPassword(""); // Password remains masked
        setSmtpUseTls(data.settings.smtpUseTls !== false);

        if (data.settings.smtpUsername) {
          setTestRecipient(data.settings.smtpUsername);
        }
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to load email settings" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Network error loading email settings" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    setTestResult(null);

    try {
      const payload: any = {
        defaultFromName: senderName.trim(),
        defaultFromEmail: senderEmail.trim(),
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort) || 465,
        smtpUsername: smtpUsername.trim(),
        smtpUseTls,
      };

      if (smtpPassword.trim().length > 0) {
        payload.smtpPassword = smtpPassword.trim();
      }

      const res = await fetch("/api/v1/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: "success",
          text: "Email gateway configuration successfully saved! Invitations will now be sent directly to employee inboxes.",
        });
        setSmtpPassword(""); // Clear password field after saving
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to save email settings" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to save email settings" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTestingConn(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/v1/settings?test_smtp=true");
      const data = await res.json();

      if (data.success) {
        setTestResult({
          type: "success",
          text: "✅ " + (data.message || "SMTP connection verified successfully!"),
        });
      } else {
        setTestResult({
          type: "error",
          text: "❌ " + (data.error || "SMTP connection failed. Please verify host, port, and credentials."),
        });
      }
    } catch (err: any) {
      setTestResult({
        type: "error",
        text: `❌ Connection check error: ${err.message}`,
      });
    } finally {
      setTestingConn(false);
    }
  }

  async function handleSendTestEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!testRecipient) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/v1/settings?test_send=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: testRecipient.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          type: "success",
          text: `🎉 ${data.message || `Test email successfully sent to ${testRecipient}!`}`,
        });
        setShowTestModal(false);
      } else {
        setTestResult({
          type: "error",
          text: `❌ ${data.error || "Failed to dispatch test email"}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        type: "error",
        text: `❌ Test email error: ${err.message}`,
      });
    } finally {
      setSendingTest(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-[var(--muted-foreground)] flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
        Loading email gateway settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {testResult && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
            testResult.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-200"
              : "bg-red-950/40 border-red-800/50 text-red-200"
          }`}
        >
          {testResult.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{testResult.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden text-xs">
        {/* Header */}
        <div className="border-b border-[var(--border)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--foreground)]">Email Gateway & SMTP Setup</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Configure outbound SMTP server to send team invitation links directly to employee inboxes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConn || !smtpHost}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
              title="Verify connection to the configured SMTP host"
            >
              {testingConn ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                  Testing...
                </>
              ) : (
                <>
                  <Activity className="w-3 h-3 text-blue-400" />
                  Test Connection
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowTestModal(true)}
              disabled={!smtpHost}
              className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
              title="Send a sample email to any address"
            >
              <Send className="w-3 h-3" />
              Send Test Email
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Sender Identity Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--foreground)]">
                Sender Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Ace Central Payment Hub"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-blue-500 transition text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--foreground)]">
                Sender Email <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="e.g. noreply@yourcompany.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-blue-500 transition text-xs font-mono"
              />
            </div>
          </div>

          {/* SMTP Server Details Section */}
          <div className="pt-4 border-t border-[var(--border)] space-y-4">
            <div className="flex items-center gap-2 font-semibold text-[var(--foreground)] text-xs">
              <Server className="w-4 h-4 text-blue-400" />
              <span>SMTP Server Connection Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="font-medium text-[var(--muted-foreground)]">
                  SMTP Host <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="e.g. smtp.gmail.com or smtp.brevo.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-blue-500 transition text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[var(--muted-foreground)]">
                  Port <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  placeholder="465 or 587"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-blue-500 transition text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-medium text-[var(--muted-foreground)]">
                  Username / Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  placeholder="e.g. your-email@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-blue-500 transition text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[var(--muted-foreground)]">
                  Password / App Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="Enter new password to change..."
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-blue-500 transition text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-slate-900/60 border border-[var(--border)]">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <label htmlFor="smtpUseTls" className="text-xs text-[var(--foreground)] flex-1 cursor-pointer font-medium">
                Use Secure Connection (TLS/SSL)
                <span className="block text-[11px] text-[var(--muted-foreground)] font-normal">
                  Recommended for Port 465 (SSL) and Port 587 (STARTTLS).
                </span>
              </label>
              <input
                id="smtpUseTls"
                type="checkbox"
                checked={smtpUseTls}
                onChange={(e) => setSmtpUseTls(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[var(--border)] p-4 sm:p-5 bg-slate-900/30 flex items-center justify-between">
          <button
            type="button"
            onClick={loadSettings}
            disabled={saving}
            className="px-3.5 py-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-white transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Email Configuration
              </>
            )}
          </button>
        </div>
      </form>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Send Test Email</h4>
                <p className="text-[11px] text-slate-400">Verify end-to-end inbox delivery</p>
              </div>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Recipient Email</label>
                <input
                  type="email"
                  required
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  disabled={sendingTest}
                  className="px-3 py-2 rounded-lg text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTest || !testRecipient}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {sendingTest ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Now
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

