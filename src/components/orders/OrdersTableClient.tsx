"use client";

import React, { useState } from "react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderDetailDrawer } from "@/components/orders/OrderDetailDrawer";
import { Eye, Search, Filter } from "lucide-react";

interface OrdersTableClientProps {
  initialOrders: any[];
}

export function OrdersTableClient({ initialOrders }: OrdersTableClientProps) {
  const [orders] = useState<any[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.appOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.cfOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerPhone && o.customerPhone.includes(searchTerm)) ||
      (o.application?.appCode && o.application.appCode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" || o.orderStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by order ID, phone, app..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">PAID</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="CREATED">CREATED</option>
            <option value="FAILED">FAILED</option>
            <option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Cashfree Order ID</th>
                <th className="pb-3 font-semibold">App Code</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Created At</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--muted-foreground)]">
                    No matching orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3 font-mono font-bold text-white">
                      {order.appOrderId}
                    </td>
                    <td className="py-3 font-mono text-[var(--muted-foreground)] text-[11px]">
                      {order.cfOrderId}
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-blue-400">
                        {order.application?.appCode}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-[var(--foreground)]">
                        {order.customerName || order.customerPhone}
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">
                        {order.customerPhone}
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-[var(--foreground)]">
                      {formatCurrency(order.orderAmount)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={order.orderStatus} />
                    </td>
                    <td className="py-3 text-[var(--muted-foreground)]">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}

