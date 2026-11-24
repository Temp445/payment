"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  ShieldCheck,
} from "lucide-react";

interface AuditLogsTableClientProps {
  initialLogs: any[];
}

export function AuditLogsTableClient({ initialLogs }: AuditLogsTableClientProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Distinct actions for filter dropdown
  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.action) set.add(log.action);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        log.action?.toLowerCase().includes(term) ||
        log.application?.appCode?.toLowerCase().includes(term) ||
        log.application?.appName?.toLowerCase().includes(term) ||
        log.entityType?.toLowerCase().includes(term) ||
        log.entityId?.toLowerCase().includes(term) ||
        log.ipAddress?.toLowerCase().includes(term) ||
        JSON.stringify(log.requestDetails || {}).toLowerCase().includes(term);

      const matchesAction = actionFilter === "ALL" || log.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, actionFilter]);

  // Pagination calculations
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

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

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ["Timestamp", "Action", "Application Code", "Entity Type", "Entity ID", "IP Address", "Details"];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredLogs.map((log) => [
      escapeCSV(formatDate(log.createdAt)),
      escapeCSV(log.action),
      escapeCSV(log.application?.appCode || "System"),
      escapeCSV(log.entityType || "-"),
      escapeCSV(log.entityId || "-"),
      escapeCSV(log.ipAddress || "Internal"),
      escapeCSV(JSON.stringify(log.requestDetails || {})),
    ].join(","));

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `Audit_Trail_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, application, entity, IP, payload..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Action filter & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by action"
              className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Actions ({logs.length})</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button if filtered */}
          {(searchTerm || actionFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setActionFilter("ALL");
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 transition flex items-center gap-1"
              title="Reset search and filters"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 transition flex items-center gap-1.5 shrink-0"
            title="Refresh audit logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
            <span className="hidden sm:inline font-medium">Refresh</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="p-2 sm:px-3 sm:py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5 shrink-0"
            title={`Export ${filteredLogs.length} audit logs to CSV`}
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline font-medium">Export CSV ({filteredLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="p-3 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="pb-3 font-semibold">Action</th>
                <th className="pb-3 font-semibold">Application</th>
                <th className="pb-3 font-semibold">Entity</th>
                <th className="pb-3 font-semibold">IP Address</th>
                <th className="pb-3 font-semibold">Details</th>
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">
                    No security audit events match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-3 font-semibold text-[var(--foreground)]">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 text-blue-400 font-medium">
                      {log.application?.appCode || "System"}
                    </td>
                    <td className="py-3 font-mono text-[var(--muted-foreground)]">
                      {log.entityType ? `${log.entityType}:${log.entityId}` : "-"}
                    </td>
                    <td className="py-3 font-mono text-[var(--muted-foreground)]">
                      {log.ipAddress || "Internal"}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-[var(--muted-foreground)] max-w-xs truncate">
                      {JSON.stringify(log.requestDetails || {})}
                    </td>
                    <td className="py-3 text-[var(--muted-foreground)]">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1 rounded hover:bg-slate-700 text-[var(--muted-foreground)] hover:text-white transition"
                        title="View Full Audit Payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            {/* Left: Items per page selector & Total Count */}
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-[var(--foreground)]">{startIndex + 1}</strong> to{" "}
                <strong className="text-[var(--foreground)]">{endIndex}</strong> of{" "}
                <strong className="text-[var(--foreground)]">{totalItems}</strong> events
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Audit logs per page"
                  className="px-2 py-1 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right: Pagination Navigation */}
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

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm text-[var(--foreground)]">Audit Event Details</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)] font-mono">{selectedLog.action}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-[var(--muted-foreground)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto text-xs pr-1">
              <div className="grid grid-cols-2 gap-3 bg-[var(--background)] p-3 rounded-lg border border-[var(--border)]">
                <div>
                  <span className="text-[var(--muted-foreground)] text-[11px]">Application:</span>
                  <p className="font-semibold text-blue-400 mt-0.5">{selectedLog.application?.appCode || "System"}</p>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)] text-[11px]">Timestamp:</span>
                  <p className="font-medium text-[var(--foreground)] mt-0.5">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)] text-[11px]">IP Address:</span>
                  <p className="font-mono text-[var(--foreground)] mt-0.5">{selectedLog.ipAddress || "Internal"}</p>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)] text-[11px]">Entity:</span>
                  <p className="font-mono text-[var(--foreground)] mt-0.5">
                    {selectedLog.entityType ? `${selectedLog.entityType}:${selectedLog.entityId}` : "-"}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[var(--muted-foreground)] text-[11px] font-semibold block mb-1">
                  Request / Action Payload:
                </span>
                <pre className="p-3 rounded-lg bg-slate-950 border border-[var(--border)] font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-64">
                  {JSON.stringify(selectedLog.requestDetails || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-[var(--border)]">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

