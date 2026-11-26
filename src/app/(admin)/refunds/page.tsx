import React, { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { RefundsClient } from "@/components/refunds/RefundsClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function RefundsContent() {
  const refunds = await prisma.refund.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        include: {
          application: { select: { appCode: true, appName: true } },
        },
      },
    },
  });

  return <RefundsClient initialRefunds={refunds} />;
}

export default function RefundsPage() {
  return (
    <>
      <Header title="Refund Management Center" />
      <Suspense fallback={<div className="h-64 rounded-xl border border-[var(--border)] bg-[var(--card)]/40" />}>
        <RefundsContent />
      </Suspense>
    </>
  );
}
