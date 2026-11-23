import React from "react";
import { Header } from "@/components/layout/Header";
import { OrdersTableClient } from "@/components/orders/OrdersTableClient";
import { prisma } from "@/lib/prisma";
import { OrderService } from "@/services/order.service";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await OrderService.autoExpireStaleOrders(20);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appMeta = (user?.app_metadata || {}) as Record<string, any>;
  const userMeta = (user?.user_metadata || {}) as Record<string, any>;
  const role: "ADMIN" | "EMPLOYEE" = (appMeta.role || userMeta.role || "EMPLOYEE").toUpperCase() === "ADMIN" ? "ADMIN" : "EMPLOYEE";
  const userAllowedAppIds: string[] = Array.isArray(appMeta.allowed_app_ids) ? appMeta.allowed_app_ids : [];

  const whereClause: any = {};
  if (role === "EMPLOYEE") {
    whereClause.applicationId = {
      in: userAllowedAppIds.length > 0 ? userAllowedAppIds : ["00000000-0000-0000-0000-000000000000"],
    };
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    take: 500,
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
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--foreground)]">Transactions Ledger</h2>
            {role === "EMPLOYEE" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Authorized Apps Only
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            {role === "ADMIN"
              ? "Real-time feed of payment checkout orders across all registered tenant applications. Click any row to inspect customer and gateway details."
              : "Real-time feed of payment checkout orders restricted to your administrator-authorized applications."}
          </p>
        </div>
      </div>

      <OrdersTableClient initialOrders={orders} />
    </>
  );
}
