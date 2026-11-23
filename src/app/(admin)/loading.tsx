import React from "react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-16 border-b border-[var(--border)] flex items-center justify-between px-2">
        <div className="h-6 w-56 bg-slate-800/80 rounded-lg"></div>
        <div className="h-8 w-36 bg-slate-800/60 rounded-full"></div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-28 bg-slate-800 rounded"></div>
              <div className="w-8 h-8 rounded-lg bg-slate-800/80"></div>
            </div>
            <div className="h-7 w-32 bg-slate-700/80 rounded"></div>
            <div className="h-3 w-40 bg-slate-800/60 rounded"></div>
          </div>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-4">
          <div className="h-4 w-40 bg-slate-800 rounded"></div>
          <div className="h-56 bg-slate-900/50 rounded-lg"></div>
        </div>
        <div className="lg:col-span-4 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-4">
          <div className="h-4 w-32 bg-slate-800 rounded"></div>
          <div className="h-56 bg-slate-900/50 rounded-lg"></div>
        </div>
      </div>

      {/* Recent Orders Skeleton */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-4">
        <div className="h-4 w-48 bg-slate-800 rounded"></div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-800/40 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
