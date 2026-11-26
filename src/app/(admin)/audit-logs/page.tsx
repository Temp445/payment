import React, { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { AuditLogsTableClient } from "@/components/audit/AuditLogsTableClient";

export const dynamic = "force-dynamic";

async function AuditLogsContent() {
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      application: {
        select: { appCode: true, appName: true },
      },
    },
  });

  return <AuditLogsTableClient initialLogs={logs} />;
}

export default function AuditLogsPage() {
  return (
    <>
      <Header title="Security & Administrative Audit Logs" />
      <div>
        <h2 className="text-base font-bold text-[var(--foreground)]">Audit Trail</h2>
        <p className="text-xs text-[var(--muted-foreground)]">
          Immutable ledger of security actions, tenant credential generation, and administrative modifications.
        </p>
      </div>
      <Suspense fallback={<div className="h-64 rounded-xl border border-[var(--border)] bg-[var(--card)]/40" />}>
        <AuditLogsContent />
      </Suspense>
    </>
  );
}

