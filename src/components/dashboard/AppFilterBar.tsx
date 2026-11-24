"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Filter, Lock, RefreshCw, Loader2 } from "lucide-react";

interface AppFilterBarProps {
  applications: { id: string; appCode: string; appName: string }[];
  selectedAppId?: string;
  userRole: "ADMIN" | "EMPLOYEE";
  isRestricted?: boolean;
}

export function AppFilterBar({
  applications,
  selectedAppId = "ALL",
  userRole,
  isRestricted = false,
}: AppFilterBarProps) {
  const router = useRouter();
  const [localAppId, setLocalAppId] = useState(selectedAppId || "ALL");
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep local state in sync when URL searchParams update
  useEffect(() => {
    setLocalAppId(selectedAppId || "ALL");
  }, [selectedAppId]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    // 1. Immediately reflect the chosen option in the select dropdown (0ms)
    setLocalAppId(val);

    // 2. Perform smooth router navigation inside React transition
    startTransition(() => {
      if (val === "ALL") {
        router.push("/");
      } else {
        router.push(`/?app=${encodeURIComponent(val)}`);
      }
    });
  }

  function handleRefresh() {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
          <Filter className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-xs text-[var(--foreground)]">
              Application Volume Filter
            </span>
            {isPending && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Updating metrics...
              </span>
            )}
            {isRestricted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Lock className="w-2.5 h-2.5" />
                Admin Assigned Apps Only
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            {userRole === "ADMIN"
              ? "Select a specific application to view its individual revenue, charts, and metrics."
              : "Viewing metrics scoped strictly to the application(s) authorized by the administrator."}
          </p>
        </div>
      </div>

      <div className="w-full sm:w-auto shrink-0 flex items-center gap-2">
        <div className="relative w-full sm:w-64">
          <select
            value={localAppId}
            onChange={handleChange}
            aria-label="Filter dashboard by application"
            className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500 transition font-medium cursor-pointer pr-8"
          >
            {userRole === "ADMIN" && (
              <option value="ALL">All Applications (Consolidated Total)</option>
            )}
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.appCode} — {app.appName}
              </option>
            ))}
            {applications.length === 0 && (
              <option value="" disabled>
                No applications available
              </option>
            )}
          </select>
          {isPending && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            </div>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isPending}
          className="p-2 rounded-lg border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 transition flex items-center gap-1.5 shrink-0"
          title="Refresh dashboard metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
          <span className="hidden sm:inline font-medium">Refresh</span>
        </button>
      </div>
    </div>
  );
}
