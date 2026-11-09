import React from "react";
import { Header } from "@/components/layout/Header";
import { RefundsClient } from "@/components/refunds/RefundsClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RefundsPage() {
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

  return (
    <>
      <Header title="Refund Management Center" />
      <RefundsClient initialRefunds={refunds} />
    </>
  );
}
