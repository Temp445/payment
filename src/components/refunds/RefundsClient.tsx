"use client";

import React, { useState, useMemo } from "react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RotateCcw, Plus, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock } from "lucide-react";

interface RefundsClientProps {
  initialRefunds: any[];
}

export function RefundsClient({ initialRefunds }: RefundsClientProps) {
  const [refunds, setRefunds] = useState<any[]>(initialRefunds);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Pagination calculations
  const totalItems = refunds.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedRefunds = refunds.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, safeCurrentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

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
      const res = await fetch("/api/v1/refunds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId.trim(),
          refund_amount: parseFloat(refundAmount),
          note: refundNote.trim() || undefined,
          app_code: appCode.trim() || undefined,
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

      {/* Refund Turnaround Times (TAT) Info Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium text-blue-400">
          <Clock className="w-4 h-4 shrink-0" />
          <span>Standard Refund Timelines (TAT):</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
          <span>• <strong>UPI / Wallets:</strong> Instant to 24–48 hrs</span>
          <span>• <strong>Net Banking:</strong> 2–4 business days</span>
          <span>• <strong>Cards:</strong> 5–7 business days</span>
          <span className="text-emerald-400">• <strong>Gateway:</strong> Instant Dispatch</span>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="p-3 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs">
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
              {paginatedRefunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">
                    No refunds initiated yet. Click &quot;Initiate Refund&quot; to issue a refund.
                  </td>
                </tr>
              ) : (
                paginatedRefunds.map((refund) => (
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

        {/* Pagination Toolbar */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
              <span>
                Showing <strong className="text-[var(--foreground)]">{startIndex + 1}</strong> to{" "}
                <strong className="text-[var(--foreground)]">{endIndex}</strong> of{" "}
                <strong className="text-[var(--foreground)]">{totalItems}</strong> refunds
              </span>

              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Rows per page"
                  className="px-2 py-1 rounded bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                title="First page"
                aria-label="First page"
                className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                title="Previous page"
                aria-label="Previous page"
                className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 mx-1">
                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition ${
                      pageNum === safeCurrentPage
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages || totalItems === 0}
                title="Next page"
                aria-label="Next page"
                className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages || totalItems === 0}
                title="Last page"
                aria-label="Last page"
                className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Initiate Refund Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-6 shadow-xl space-y-4">
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
                  Tenant App Code <span className="text-[10px] opacity-70">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. REAL_ESTATE_CRM"
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
                  placeholder="e.g. ORD_... or REALESTA_ORD_..."
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

              {/* Estimated Refund Timelines (TAT) */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-[11px] space-y-1.5 text-slate-300">
                <div className="flex items-center gap-1.5 font-semibold text-blue-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Estimated Refund Credit Turnaround Time (TAT)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-300 pt-0.5">
                  <div>• <span className="font-semibold text-white">UPI / Wallets:</span> Instant to 24–48 hours</div>
                  <div>• <span className="font-semibold text-white">Net Banking:</span> 2 to 4 business days</div>
                  <div>• <span className="font-semibold text-white">Credit / Debit Cards:</span> 5 to 7 business days</div>
                  <div>• <span className="font-semibold text-emerald-400">Gateway Processing:</span> Instant via Cashfree</div>
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)] pt-0.5">
                  Funds are credited back to the customer&apos;s original source payment method.
                </p>
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

