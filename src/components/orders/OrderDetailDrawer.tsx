"use client";

import React from "react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { X, CreditCard, User, Clock, FileJson, AlertCircle } from "lucide-react";

interface OrderDetailDrawerProps {
  order: any | null;
  onClose: () => void;
}

export function OrderDetailDrawer({ order, onClose }: OrderDetailDrawerProps) {
  if (!order) return null;

  const payment = order.payments?.[0];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 flex justify-end">
      <div className="w-full max-w-xl bg-[var(--card)] border-l border-[var(--border)] h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white">{order.appOrderId}</span>
              <StatusBadge status={order.orderStatus} />
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Cashfree ID: <span className="font-mono text-blue-400">{order.cfOrderId}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-[var(--muted-foreground)] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & App Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">Order Amount</span>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {formatCurrency(order.orderAmount)}
            </div>
            <span className="text-[11px] text-[var(--muted-foreground)] font-mono">{order.orderCurrency}</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">Tenant Application</span>
            <div className="text-base font-bold text-blue-400 mt-1">
              {order.application?.appCode || "APP"}
            </div>
            <span className="text-xs text-[var(--muted-foreground)] truncate block">{order.application?.appName}</span>
          </div>
        </div>

        {/* Customer Information */}
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-blue-400" />
            Customer Information
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[var(--muted-foreground)] block">Customer Name</span>
              <span className="font-medium text-white">{order.customerName || "-"}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">Phone</span>
              <span className="font-mono text-white">{order.customerPhone}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">Email</span>
              <span className="text-white truncate block">{order.customerEmail || "-"}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">Customer ID</span>
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
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[var(--muted-foreground)] block">Cashfree Payment ID</span>
                <span className="font-mono text-white font-medium">{payment.cfPaymentId}</span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">Method / Group</span>
                <span className="font-medium text-white capitalize">{payment.paymentMethod || payment.paymentGroup || "N/A"}</span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">Bank Reference</span>
                <span className="font-mono text-white">{payment.bankReference || "-"}</span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">Payment Time</span>
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

