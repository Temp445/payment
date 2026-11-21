"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  RefreshCw,
  Clock,
} from "lucide-react";

interface OrderRefundModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: {
    orderId: string;
    refundId: string;
    refundAmount: number;
    orderStatus: string;
    refundStatus: string;
  }) => void;
}

export function OrderRefundModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: OrderRefundModalProps) {
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    refundId: string;
    orderStatus: string;
  } | null>(null);

  // Compute available balance to refund
  const totalPaid = Number(order?.orderAmount || 0);
  const totalAlreadyRefunded = (order?.refunds || [])
    .filter(
      (r: any) => r.refundStatus === "SUCCESS" || r.refundStatus === "PENDING"
    )
    .reduce((sum: number, r: any) => sum + Number(r.refundAmount || 0), 0);
  const maxRefundable = Math.max(0, totalPaid - totalAlreadyRefunded);

  // Reset form when order changes
  useEffect(() => {
    if (order && isOpen) {
      setRefundAmount(maxRefundable > 0 ? maxRefundable.toString() : "");
      setRefundNote("");
      setError(null);
      setSuccessInfo(null);
    }
  }, [order, isOpen, maxRefundable]);

  if (!isOpen || !order) return null;

  async function handleRefundSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(refundAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid refund amount greater than 0.");
      return;
    }

    if (amountNum > maxRefundable) {
      setError(
        `Refund amount cannot exceed available balance of ${formatCurrency(
          maxRefundable
        )}.`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/refunds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: order.appOrderId || order.cfOrderId,
          refund_amount: amountNum,
          note: refundNote.trim() || `Refund initiated from Orders page for ${order.appOrderId}`,
          app_code: order.application?.appCode,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessInfo({
          refundId: data.refund_id,
          orderStatus: data.order_status,
        });

        // Notify parent to update local order state
        onSuccess({
          orderId: order.id,
          refundId: data.refund_id,
          refundAmount: amountNum,
          orderStatus: data.order_status,
          refundStatus: data.refund_status || "SUCCESS",
        });
      } else {
        setError(data.error || "Failed to process refund. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--foreground)]">
                Issue Gateway Refund
              </h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Direct Cashfree PG refund for order{" "}
                <span className="font-mono text-white font-medium">
                  {order.appOrderId}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successInfo ? (
          <div className="space-y-4 py-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Refund Initiated Successfully!</span>
              </div>
              <p className="text-slate-300">
                Cashfree Reference ID:{" "}
                <span className="font-mono font-bold text-white">
                  {successInfo.refundId}
                </span>
              </p>
              <p className="text-slate-300">
                Order Status:{" "}
                <span
                  className={`font-semibold ${
                    successInfo.orderStatus === "REFUND_PENDING"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {successInfo.orderStatus === "REFUND_PENDING"
                    ? "REFUND PENDING (Processing with Bank)"
                    : successInfo.orderStatus}
                </span>
              </p>
              <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-slate-300 space-y-1">
                <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Estimated Credit Timeline:
                </span>
                <p className="text-[11px] text-slate-400 pl-5">
                  • <strong>UPI / Wallets:</strong> Instant to 24–48 hours<br />
                  • <strong>Net Banking:</strong> 2 to 4 business days<br />
                  • <strong>Debit / Credit Cards:</strong> 5 to 7 business days
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
            {/* Order Summary Cards */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div>
                <span className="text-[11px] text-[var(--muted-foreground)] block">
                  Original Order Total
                </span>
                <span className="font-bold text-sm text-[var(--foreground)]">
                  {formatCurrency(totalPaid)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--muted-foreground)] block">
                  Available to Refund
                </span>
                <span className="font-bold text-sm text-emerald-400 font-mono">
                  {formatCurrency(maxRefundable)}
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  App:{" "}
                  <strong className="text-white">
                    {order.application?.appCode || "APP"}
                  </strong>
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  CF: {order.cfOrderId}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Refund Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-[var(--foreground)]">
                  Refund Amount (INR ₹) <span className="text-rose-400">*</span>
                </label>
                {maxRefundable > 0 && (
                  <button
                    type="button"
                    onClick={() => setRefundAmount(maxRefundable.toString())}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                  >
                    Full Refund ({formatCurrency(maxRefundable)})
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxRefundable}
                required
                disabled={loading || maxRefundable <= 0}
                placeholder="0.00"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono text-sm focus:outline-none focus:border-rose-500 transition"
              />
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                Enter either the full amount or a partial refund amount.
              </p>
            </div>

            {/* Refund Reason / Note */}
            <div>
              <label className="block font-semibold text-[var(--foreground)] mb-1">
                Refund Reason / Audit Note{" "}
                <span className="text-[10px] text-[var(--muted-foreground)] font-normal">
                  (Optional)
                </span>
              </label>
              <textarea
                rows={2}
                disabled={loading}
                placeholder="e.g. Customer requested cancellation / Unit unhold"
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-rose-500 transition text-xs"
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
                Funds are credited back to the customer&apos;s original payment method automatically.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || maxRefundable <= 0}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-900/30"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Refund...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm & Process Refund</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

