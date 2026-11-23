"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/Badge";
import {
  formatCurrency,
  formatDate,
  getOrderDisplayStatus,
  getOrderEnvironment,
} from "@/lib/utils";
import { OrderDetailDrawer } from "@/components/orders/OrderDetailDrawer";
import { OrderRefundModal } from "@/components/orders/OrderRefundModal";
import {
  Eye,
  Search,
  Filter,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Shield,
} from "lucide-react";

interface OrdersTableClientProps {
  initialOrders: any[];
}

export function OrdersTableClient({ initialOrders }: OrdersTableClientProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [refundingOrder, setRefundingOrder] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [envFilter, setEnvFilter] = useState("ALL");
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        o.appOrderId?.toLowerCase().includes(term) ||
        o.cfOrderId?.toLowerCase().includes(term) ||
        (o.customerPhone && o.customerPhone.includes(term)) ||
        (o.customerName && o.customerName.toLowerCase().includes(term)) ||
        (o.application?.appCode && o.application.appCode.toLowerCase().includes(term)) ||
        (Array.isArray(o.payments) &&
          o.payments.some(
            (p: any) => p.cfPaymentId && String(p.cfPaymentId).toLowerCase().includes(term)
          ));

      const displayStatus = getOrderDisplayStatus(o);
      const matchesStatus =
        statusFilter === "ALL" ||
        o.orderStatus === statusFilter ||
        displayStatus.status === statusFilter;

      const env = getOrderEnvironment(o);
      const matchesEnv =
        envFilter === "ALL" ||
        (envFilter === "PRODUCTION" && env === "production") ||
        (envFilter === "SANDBOX" && env === "sandbox");

      // Date filtering
      let matchesDate = true;
      if (datePreset !== "ALL" || startDate || endDate) {
        const orderDate = new Date(o.createdAt);
        const orderTime = orderDate.getTime();
        const now = new Date();

        if (datePreset === "TODAY") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          matchesDate = orderTime >= startOfToday;
        } else if (datePreset === "YESTERDAY") {
          const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
          const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1;
          matchesDate = orderTime >= startOfYesterday && orderTime <= endOfYesterday;
        } else if (datePreset === "7D") {
          const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
          matchesDate = orderTime >= sevenDaysAgo;
        } else if (datePreset === "30D") {
          const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).getTime();
          matchesDate = orderTime >= thirtyDaysAgo;
        } else if (datePreset === "THIS_MONTH") {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          matchesDate = orderTime >= startOfMonth;
        } else if (datePreset === "CUSTOM") {
          if (startDate) {
            const start = new Date(startDate + "T00:00:00").getTime();
            if (orderTime < start) matchesDate = false;
          }
          if (endDate) {
            const end = new Date(endDate + "T23:59:59.999").getTime();
            if (orderTime > end) matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesEnv && matchesDate;
    });
  }, [orders, searchTerm, statusFilter, datePreset, startDate, endDate]);

  // Reset page when filter or search changes
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleDatePresetChange = (val: string) => {
    setDatePreset(val);
    if (val !== "CUSTOM") {
      setStartDate("");
      setEndDate("");
    }
    setCurrentPage(1);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setCurrentPage(1);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setEnvFilter("ALL");
    setDatePreset("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const handleRefundSuccess = (result: {
    orderId: string;
    refundId: string;
    refundAmount: number;
    orderStatus: string;
    refundStatus: string;
  }) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === result.orderId) {
          const updated = {
            ...o,
            orderStatus: result.orderStatus,
            refunds: [
              ...(o.refunds || []),
              {
                id: result.refundId,
                cfRefundId: result.refundId,
                refundAmount: result.refundAmount,
                refundStatus: result.refundStatus,
                createdAt: new Date().toISOString(),
              },
            ],
          };
          if (selectedOrder?.id === o.id) {
            setSelectedOrder(updated);
          }
          return updated;
        }
        return o;
      })
    );
    router.refresh();
  };

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "ALL" ||
    envFilter !== "ALL" ||
    datePreset !== "ALL" ||
    startDate ||
    endDate;

  const handlePageSizeChange = (val: number) => {
    setPageSize(val);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Generate page numbers array (up to 5 buttons centered on current page)
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

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full xl:w-80">
          <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Order ID, CF Order ID, Payment ID, phone..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filters Group: Date + Status + Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter Preset */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
            <select
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              aria-label="Filter by date range"
              className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Range...</option>
            </select>
          </div>

          {/* Custom Date Range Picker */}
          {datePreset === "CUSTOM" && (
            <div className="flex items-center gap-1.5 text-xs bg-[var(--card)] px-2 py-1 rounded-lg border border-[var(--border)]">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                aria-label="Start date"
                className="bg-transparent text-xs text-[var(--foreground)] focus:outline-none"
              />
              <span className="text-[var(--muted-foreground)] text-[11px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                aria-label="End date"
                className="bg-transparent text-xs text-[var(--foreground)] focus:outline-none"
              />
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              aria-label="Filter by order status"
              className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="CREATED">CREATED</option>
              <option value="REFUND_PENDING">REFUND PENDING</option>
              <option value="REFUNDED">REFUNDED</option>
              <option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* Environment Filter */}
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[var(--muted-foreground)]" />
            <select
              value={envFilter}
              onChange={(e) => {
                setEnvFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by environment"
              className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Environments</option>
              <option value="PRODUCTION">Live Production</option>
              <option value="SANDBOX">Sandbox / Test</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 transition flex items-center gap-1"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="p-3 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Cashfree Order / Payment ID</th>
                <th className="pb-3 font-semibold">App Code</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Amount</th>
                {/* <th className="pb-3 font-semibold">Env</th> */}
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Created At</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[var(--muted-foreground)]">
                    No matching orders found.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const paymentIds = Array.isArray(order.payments)
                    ? order.payments
                        .map((p: any) => p.cfPaymentId)
                        .filter((id: any) => Boolean(id))
                    : [];

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-3 font-mono font-bold text-white">
                        {order.appOrderId}
                      </td>
                      <td className="py-3 font-mono text-[11px]">
                        <div
                          className="text-[var(--foreground)] font-medium truncate max-w-[210px]"
                          title={`Cashfree Order ID: ${order.cfOrderId}`}
                        >
                          {order.cfOrderId}
                        </div>
                        {paymentIds.length > 0 ? (
                          <div
                            className="flex items-center gap-1 text-[10px] text-emerald-400 mt-0.5"
                            title={`Cashfree Payment ID: ${paymentIds.join(", ")}`}
                          >
                            <span className="text-[var(--muted-foreground)]">Pay ID:</span>
                            <span className="font-semibold text-emerald-300 font-mono select-all">
                              {paymentIds[0]}
                            </span>
                            {paymentIds.length > 1 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                +{paymentIds.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            No payment ID
                          </div>
                        )}
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
                    {/* <td className="py-3">
                      {getOrderEnvironment(order) === "production" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          LIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          SANDBOX
                        </span>
                      )}
                    </td> */}
                    {(() => {
                      const display = getOrderDisplayStatus(order);
                      const canRefund =
                        (order.orderStatus === "PAID" ||
                          order.orderStatus === "PARTIALLY_REFUNDED") &&
                        !display.isPendingRefund &&
                        !display.isFullyRefunded;

                      return (
                        <>
                          <td className="py-3">
                            <StatusBadge status={display.badgeStatus}>
                              {display.label}
                            </StatusBadge>
                          </td>
                          <td className="py-3 text-[var(--muted-foreground)]">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canRefund && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRefundingOrder(order);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium transition cursor-pointer"
                                  title="Refund Order"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Refund</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Details</span>
                              </button>
                            </div>
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                );
              })
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
                <strong className="text-[var(--foreground)]">{totalItems}</strong> orders
              </span>

              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  aria-label="Rows per page"
                  className="px-2 py-1 rounded bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                title="First page"
                aria-label="First page"
                className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                title="Previous page"
                aria-label="Previous page"
                className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Number Buttons */}
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

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages || totalItems === 0}
                title="Next page"
                aria-label="Next page"
                className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
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

      {/* Slide-over Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onRefund={(order) => setRefundingOrder(order)}
      />

      {/* Gateway Refund Initiation Modal */}
      <OrderRefundModal
        order={refundingOrder}
        isOpen={!!refundingOrder}
        onClose={() => setRefundingOrder(null)}
        onSuccess={handleRefundSuccess}
      />
    </div>
  );
}

