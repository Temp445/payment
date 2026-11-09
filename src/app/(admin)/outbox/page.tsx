import React from "react";
import { Header } from "@/components/layout/Header";
import { OutboxClient } from "@/components/outbox/OutboxClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OutboxPage() {
  const deliveries = await prisma.webhookOutboxQueue.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      application: {
        select: { appCode: true, appName: true, webhookUrl: true },
      },
    },
  });

  return (
    <>
      <Header title="Webhook Outbox & Delivery Monitor" />
      <OutboxClient initialDeliveries={deliveries} />
    </>
  );
}
