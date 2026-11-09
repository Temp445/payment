"use client";

import React, { useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RefreshCw, Landmark, CheckCircle2, Clock, Check } from "lucide-react";

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

  const discrepancy = paidVolume - settledVolume;

  async function handleSync() {
    setSyncing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/reconciliation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY || "admin_secret_hub_master_key_change_me"}`,
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
              {settlements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                    No settlement records found. Click &quot;Sync Settlements from Cashfree&quot; to fetch payout batches.
                  </td>
                </tr>
              ) : (
                settlements.map((item) => (
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
      </div>
    </div>
  );
}

