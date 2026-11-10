import React from "react";
import { Header } from "@/components/layout/Header";
import { OrdersTableClient } from "@/components/orders/OrdersTableClient";
import { prisma } from "@/lib/prisma";
import { OrderService } from "@/services/order.service";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await OrderService.autoExpireStaleOrders(20);

  const orders = await prisma.order.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      application: {
        select: { appCode: true, appName: true },
      },
      payments: {
        select: {
          cfPaymentId: true,
          paymentStatus: true,
          paymentMethod: true,
          paymentGroup: true,
          bankReference: true,
          paymentTime: true,
          rawWebhookPayload: true,
        },
      },
      refunds: true,
    },
  });

  return (
    <>
      <Header title="Live Orders & Transactions Explorer" />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--foreground)]">Transactions Ledger</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Real-time feed of payment checkout orders across all 20 consumer applications. Click any row to inspect customer and gateway details.
          </p>
        </div>
      </div>

      <OrdersTableClient initialOrders={orders} />
    </>
  );
}
