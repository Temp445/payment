"use client";

import React, { useState } from "react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RotateCcw, Plus, AlertCircle } from "lucide-react";

interface RefundsClientProps {
  initialRefunds: any[];
}

export function RefundsClient({ initialRefunds }: RefundsClientProps) {
  const [refunds, setRefunds] = useState<any[]>(initialRefunds);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [appCode, setAppCode] = useState("");
  const [orderId, setOrderId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");

  async function handleCreateRefund(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Find the app credentials or send admin request
      const res = await fetch("/api/v1/refunds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": `pub_live_${appCode.toLowerCase()}`, // or admin override
          "x-client-secret": "sec_live_admin",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY || "admin_secret_hub_master_key_change_me"}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          refund_amount: parseFloat(refundAmount),
          note: refundNote,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Refund successfully initiated! Reference: ${data.refund_id}`);
        setShowModal(false);
        window.location.reload();
      } else {
        setError(data.error || "Failed to initiate refund");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Initiate Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--foreground)]">Processed & Pending Refunds</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Audit trail of full and partial refunds initiated via Cashfree PG.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Initiate Refund
        </button>
      </div>

      {/* Refunds Table */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="pb-3 font-semibold">Refund ID</th>
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Application</th>
                <th className="pb-3 font-semibold">Refund Amount</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Reason / Note</th>
                <th className="pb-3 font-semibold">Initiated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {refunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">
                    No refunds initiated yet. Click &quot;Initiate Refund&quot; to issue a refund.
                  </td>
                </tr>
              ) : (
                refunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-slate-800/40">
                    <td className="py-3 font-mono font-medium text-white">
                      {refund.cfRefundId || refund.id}
                    </td>
                    <td className="py-3 font-mono text-[var(--muted-foreground)]">
                      {refund.order?.appOrderId}
                    </td>
                    <td className="py-3 font-semibold text-blue-400">
                      {refund.order?.application?.appCode}
                    </td>
                    <td className="py-3 font-bold text-rose-400">
                      {formatCurrency(refund.refundAmount)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={refund.refundStatus} />
                    </td>
                    <td className="py-3 text-[var(--muted-foreground)] max-w-xs truncate">
                      {refund.refundNote || "-"}
                    </td>
                    <td className="py-3 text-[var(--muted-foreground)]">
                      {formatDate(refund.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Initiate Refund Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-blue-400" />
                Initiate Gateway Refund
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-[var(--muted-foreground)] hover:text-white"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateRefund} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--muted-foreground)] mb-1">
                  Tenant App Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="APP001"
                  value={appCode}
                  onChange={(e) => setAppCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] mb-1">
                  Order ID to Refund
                </label>
                <input
                  type="text"
                  required
                  placeholder="APP001_ORD_99182"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] mb-1">
                  Refund Amount (INR ₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="500.00"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] mb-1">
                  Refund Reason / Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Customer return request"
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-blue-500"
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
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Confirm & Send Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

