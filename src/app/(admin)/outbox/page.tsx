import React, { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { OutboxClient } from "@/components/outbox/OutboxClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function OutboxContent() {
  const deliveries = await prisma.webhookOutboxQueue.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      application: {
        select: { appCode: true, appName: true, webhookUrl: true },
      },
    },
  });

  return <OutboxClient initialDeliveries={deliveries} />;
}

export default function OutboxPage() {
  return (
    <>
      <Header title="Webhook Outbox & Delivery Monitor" />
      <Suspense fallback={<div className="h-64 rounded-xl border border-[var(--border)] bg-[var(--card)]/40" />}>
        <OutboxContent />
      </Suspense>
    </>
  );
}
