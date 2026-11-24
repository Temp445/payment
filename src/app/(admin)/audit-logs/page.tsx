import React from "react";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { AuditLogsTableClient } from "@/components/audit/AuditLogsTableClient";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    take: 500,
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

      <AuditLogsTableClient initialLogs={logs} />
    </>
  );
}

