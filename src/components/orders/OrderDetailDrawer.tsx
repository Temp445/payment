"use client";

import React, { useState } from "react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, getOrderDisplayStatus, getOrderEnvironment } from "@/lib/utils";
import {
  X,
  CreditCard,
  User,
  Clock,
  FileJson,
  AlertCircle,
  RotateCcw,
  RefreshCw,
} from "lucide-react";

interface OrderDetailDrawerProps {
  order: any | null;
  onClose: () => void;
  onRefund?: (order: any) => void;
}

export function OrderDetailDrawer({
  order,
  onClose,
  onRefund,
}: OrderDetailDrawerProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  if (!order) return null;

  const payment = order.payments?.[0];
  const display = getOrderDisplayStatus(order);
  const canRefund =
    (order.orderStatus === "PAID" || order.orderStatus === "PARTIALLY_REFUNDED") &&
    !display.isPendingRefund &&
    !display.isFullyRefunded;

  async function handleSyncRefund() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/v1/refunds/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.appOrderId }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMsg(`Synced with Cashfree: ${data.displayStatus || data.orderStatus}`);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setSyncMsg(`Sync error: ${data.error || "Failed to sync"}`);
      }
    } catch (e: any) {
      setSyncMsg(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 flex justify-end">
      <div className="w-full max-w-xl bg-[var(--card)] border-l border-[var(--border)] h-full overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-white truncate">
                {order.appOrderId}
              </span>
              <StatusBadge status={display.badgeStatus}>
                {display.label}
              </StatusBadge>
            </div>
            <div className="flex flex-col gap-0.5 mt-1 text-xs font-mono">
              <span className="text-[var(--muted-foreground)] truncate">
                Cashfree Order ID: <span className="text-blue-400 font-medium">{order.cfOrderId}</span>
              </span>
              {payment?.cfPaymentId && (
                <span className="text-emerald-400 text-[11px] truncate flex items-center gap-1">
                  <span>Payment ID:</span>
                  <span className="font-semibold text-emerald-300 select-all">{payment.cfPaymentId}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canRefund && onRefund && (
              <button
                onClick={() => onRefund(order)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                title="Refund Order"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refund</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-[var(--muted-foreground)] hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pending Refund Banner with Sync Action */}
        {display.isPendingRefund && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 text-amber-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Refund Processing (Pending Customer Credit)</span>
              </div>
              <button
                onClick={handleSyncRefund}
                disabled={syncing}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1 transition shrink-0 cursor-pointer disabled:opacity-50"
                title="Check latest status from Cashfree"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                <span>{syncing ? "Checking..." : "Sync Status"}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-300">
              The refund is currently in transit with the banking network. Status will update to <strong>REFUNDED</strong> once the customer receives the funds.
            </p>
            {syncMsg && (
              <p className="text-[11px] text-emerald-400 font-medium">{syncMsg}</p>
            )}
          </div>
        )}

        {/* Amount & App Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
              Order Amount
            </span>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {formatCurrency(order.orderAmount)}
            </div>
            <span className="text-[11px] text-[var(--muted-foreground)] font-mono">
              {order.orderCurrency}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
              Tenant Application
            </span>
            <div className="text-base font-bold text-blue-400 mt-1">
              {order.application?.appCode || "APP"}
            </div>
            <span className="text-xs text-[var(--muted-foreground)] truncate block">
              {order.application?.appName}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
              Environment
            </span>
            <div className="mt-1">
              {getOrderEnvironment(order) === "production" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  LIVE PRODUCTION
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  SANDBOX TEST
                </span>
              )}
            </div>
            <span className="text-[10px] text-[var(--muted-foreground)] block mt-1">
              {getOrderEnvironment(order) === "production"
                ? "Live customer transaction"
                : "Simulated test transaction"}
            </span>
          </div>
        </div>

        {/* Customer Information */}
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-blue-400" />
            Customer Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[var(--muted-foreground)] block">
                Customer Name
              </span>
              <span className="font-medium text-white">
                {order.customerName || "-"}
              </span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">Phone</span>
              <span className="font-mono text-white">{order.customerPhone}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">Email</span>
              <span className="text-white truncate block">
                {order.customerEmail || "-"}
              </span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">
                Customer ID
              </span>
              <span className="font-mono text-white">{order.customerId}</span>
            </div>
          </div>
        </div>

        {/* Payment & Cashfree Details */}
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            Payment Gateway Details
          </h4>
          {payment ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[var(--muted-foreground)] block">
                  Cashfree Payment ID
                </span>
                <span className="font-mono text-white font-medium">
                  {payment.cfPaymentId}
                </span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">
                  Method / Group
                </span>
                <span className="font-medium text-white capitalize">
                  {payment.paymentMethod || payment.paymentGroup || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">
                  Bank Reference
                </span>
                <span className="font-mono text-white">
                  {payment.bankReference || "-"}
                </span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">
                  Payment Time
                </span>
                <span className="text-white">{formatDate(payment.paymentTime)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-400 p-2 rounded bg-amber-500/10">
              <AlertCircle className="w-4 h-4" />
              <span>No completed payment record yet for this order session.</span>
            </div>
          )}
        </div>

        {/* Refunds History (if any) */}
        {order.refunds && order.refunds.length > 0 && (
          <div className="p-4 rounded-xl bg-[var(--background)] border border-rose-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                Refund Audit Trail ({order.refunds.length})
              </h4>
              <button
                onClick={handleSyncRefund}
                disabled={syncing}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                <span>Refresh Status</span>
              </button>
            </div>
            <div className="space-y-2">
              {order.refunds.map((rf: any) => (
                <div
                  key={rf.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-white block">
                      {rf.cfRefundId || rf.id}
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {formatDate(rf.createdAt)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-400 block font-mono">
                      -{formatCurrency(rf.refundAmount)}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        rf.refundStatus === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : rf.refundStatus === "FAILED"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {rf.refundStatus === "SUCCESS"
                        ? "CREDITED"
                        : rf.refundStatus === "FAILED"
                        ? "FAILED"
                        : "PENDING (IN TRANSIT)"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] pt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400 shrink-0" />
              <span>Credit TAT: Instant–48h for UPI/Wallets, 2–4 days for NetBanking, 5–7 business days for Cards.</span>
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-2 text-xs">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            Audit Timestamps
          </h4>
          <div className="flex justify-between p-2 rounded bg-[var(--background)] border border-[var(--border)]">
            <span className="text-[var(--muted-foreground)]">Created At:</span>
            <span className="font-mono">{formatDate(order.createdAt)}</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-[var(--background)] border border-[var(--border)]">
            <span className="text-[var(--muted-foreground)]">Last Updated:</span>
            <span className="font-mono">{formatDate(order.updatedAt)}</span>
          </div>
        </div>

        {/* Order Metadata */}
        {order.metadata && typeof order.metadata === "object" && Object.keys(order.metadata).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
              <FileJson className="w-3.5 h-3.5 text-emerald-400" />
              Order Metadata
            </h4>
            <pre className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[11px] font-mono text-[var(--foreground)] overflow-x-auto max-h-48">
              {JSON.stringify(order.metadata, null, 2)}
            </pre>
          </div>
        )}

        {/* Raw Webhook Payload */}
        {payment?.rawWebhookPayload && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
              <FileJson className="w-3.5 h-3.5 text-blue-400" />
              Raw Cashfree Webhook Payload
            </h4>
            <pre className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[11px] font-mono text-[var(--foreground)] overflow-x-auto max-h-48">
              {JSON.stringify(payment.rawWebhookPayload, null, 2)}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}
