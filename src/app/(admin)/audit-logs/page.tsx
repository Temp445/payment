import React from "react";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      application: {
        select: { appCode: true, appName: true },
      },
    },
  });

  return (
    <>
      <Header title="Security & Administrative Audit Logs" />

      <div>
        <h2 className="text-base font-bold text-[var(--foreground)]">Audit Trail</h2>
        <p className="text-xs text-[var(--muted-foreground)]">
          Immutable ledger of security actions, tenant credential generation, and administrative modifications.
        </p>
      </div>

      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="pb-3 font-semibold">Action</th>
                <th className="pb-3 font-semibold">Application</th>
                <th className="pb-3 font-semibold">Entity</th>
                <th className="pb-3 font-semibold">IP Address</th>
                <th className="pb-3 font-semibold">Details</th>
                <th className="pb-3 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                    No security events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 font-semibold text-white">
                      {log.action}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

