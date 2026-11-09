"use client";

import React, { useState } from "react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { RefreshCw, Send, CheckCircle2, AlertTriangle } from "lucide-react";

interface OutboxClientProps {
  initialDeliveries: any[];
}

export function OutboxClient({ initialDeliveries }: OutboxClientProps) {
  const [deliveries, setDeliveries] = useState<any[]>(initialDeliveries);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRetry(id?: string) {
    if (id) setRetryingId(id);
    else setRetryingAll(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/outbox/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY || "admin_secret_hub_master_key_change_me"}`,
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`Delivery processed: ${data.successful || 0} successful, ${data.failed || 0} failed.`);
        // Reload after short delay
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage(`Retry failed: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setMessage(`Network error: ${err.message}`);
    } finally {
      setRetryingId(null);
      setRetryingAll(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--foreground)]">Outgoing Webhook Queue (No Redis)</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            PostgreSQL Transactional Outbox tracking verified payment notifications dispatched to your 20 client applications.
          </p>
        </div>
        <button
          onClick={() => handleRetry()}
          disabled={retryingAll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${retryingAll ? "animate-spin" : ""}`} />
          {retryingAll ? "Processing Queue..." : "Process Pending Queue"}
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {/* Outbox Table */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="pb-3 font-semibold">Event</th>
                <th className="pb-3 font-semibold">Application</th>
                <th className="pb-3 font-semibold">Destination URL</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Attempts</th>
                <th className="pb-3 font-semibold">HTTP Code</th>
                <th className="pb-3 font-semibold">Last Error</th>
                <th className="pb-3 font-semibold">Dispatched At</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[var(--muted-foreground)]">
                    No webhook delivery events recorded yet.
                  </td>
                </tr>
              ) : (
                deliveries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="py-3 font-mono font-semibold text-blue-400">
                      {item.eventType}
                    </td>
                    <td className="py-3 font-bold text-white">
                      {item.application?.appCode}
                    </td>
                    <td className="py-3 font-mono text-[var(--muted-foreground)] max-w-xs truncate">
                      {item.application?.webhookUrl || "-"}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 font-medium">
                      {item.attempts} / {item.maxAttempts}
                    </td>
                    <td className="py-3 font-mono text-[var(--foreground)]">
                      {item.responseStatus || "-"}
                    </td>
                    <td className="py-3 text-rose-400 max-w-xs truncate">
                      {item.lastError || "-"}
                    </td>
                    <td className="py-3 text-[var(--muted-foreground)]">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3 text-right">
                      {item.status !== "DELIVERED" ? (
                        <button
                          onClick={() => handleRetry(item.id)}
                          disabled={retryingId === item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${retryingId === item.id ? "animate-spin" : ""}`} />
                          Retry
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium">Delivered</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

