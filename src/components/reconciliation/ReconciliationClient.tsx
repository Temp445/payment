"use client";

import React, { useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  RefreshCw,
  Landmark,
  CheckCircle2,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface ReconciliationClientProps {
  settledVolume: number;
  settledCount: number;
  paidVolume: number;
  initialSettlements: any[];
}

export function ReconciliationClient({
  settledVolume,
  settledCount,
  paidVolume,
  initialSettlements,
}: ReconciliationClientProps) {
  const [settlements, setSettlements] = useState<any[]>(initialSettlements);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = settlements.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedSettlements = settlements.slice(startIndex, endIndex);

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

  const discrepancy = paidVolume - settledVolume;

  async function handleSync() {
    setSyncing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/reconciliation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "sync" }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`Settlements synced successfully! (${data.synced_count} records updated)`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage(`Sync failed: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setMessage(`Network error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--foreground)]">Settlement Ledgers</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Audit payouts transferred from Cashfree PG bank accounts to merchant account.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing with Cashfree..." : "Sync Settlements from Cashfree"}
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Cashfree Settled"
          value={formatCurrency(settledVolume)}
          subtitle={`${settledCount} settlement batches`}
          icon={Landmark}
        />
        <StatCard
          title="Customer Paid Volume"
          value={formatCurrency(paidVolume)}
          subtitle="All verified orders"
          icon={CheckCircle2}
        />
        <StatCard
          title="Pending Settlement In-Flight"
          value={formatCurrency(Math.max(0, discrepancy))}
          subtitle="Awaiting next Cashfree cycle (T+1 / T+2)"
          icon={Clock}
        />
      </div>

      {/* Settlements Table */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-4">
        <h3 className="font-semibold text-sm text-[var(--foreground)]">Recent Settlement Batches</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="pb-3 font-semibold">Settlement ID</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">UTR Number</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Settlement Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedSettlements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                    No settlement records found. Click &quot;Sync Settlements from Cashfree&quot; to fetch payout batches.
                  </td>
                </tr>
              ) : (
                paginatedSettlements.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="py-3 font-mono font-bold text-white">
                      {item.cfSettlementId}
                    </td>
                    <td className="py-3 font-semibold text-emerald-400">
                      {formatCurrency(item.settlementAmount)}
                    </td>
                    <td className="py-3 font-mono text-[var(--muted-foreground)]">
                      {item.utrNumber || "In Transit"}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--muted-foreground)]">
                      {formatDate(item.settlementDate)}
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
                <strong className="text-[var(--foreground)]">{totalItems}</strong> settlements
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
    </div>
  );
}

