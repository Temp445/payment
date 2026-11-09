import React from "react";
import { Header } from "@/components/layout/Header";
import { ReconciliationClient } from "@/components/reconciliation/ReconciliationClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  let settledVolume = 0;
  let settledCount = 0;
  let paidVolume = 0;
  let settlements: any[] = [];

  try {
    const [settledAgg, paidAgg, list] = await Promise.all([
      prisma.settlement.aggregate({
        _sum: { settlementAmount: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: { orderStatus: "PAID" },
        _sum: { orderAmount: true },
      }),
      prisma.settlement.findMany({
        take: 30,
        orderBy: { settlementDate: "desc" },
      }),
    ]);

    settledVolume = Number(settledAgg._sum.settlementAmount || 0);
    settledCount = settledAgg._count;
    paidVolume = Number(paidAgg._sum.orderAmount || 0);
    settlements = list;
  } catch (err) {
    console.error("Reconciliation fetch error:", err);
  }

  return (
    <>
      <Header title="Cashfree Settlement & Reconciliation" />
      <ReconciliationClient
        settledVolume={settledVolume}
        settledCount={settledCount}
        paidVolume={paidVolume}
        initialSettlements={settlements}
      />
    </>
  );
}
