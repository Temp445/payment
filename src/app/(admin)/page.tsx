import React, { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { MethodPieChart } from "@/components/dashboard/MethodPieChart";
import { StatusBadge } from "@/components/ui/Badge";
import { AppFilterBar } from "@/components/dashboard/AppFilterBar";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, getOrderDisplayStatus, getOrderEnvironment } from "@/lib/utils";
import { DollarSign, Activity, Layers, Send } from "lucide-react";
import Link from "next/link";
import { OrderService } from "@/services/order.service";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-16 border-b border-[var(--border)] flex items-center justify-between px-2">
        <div className="h-6 w-56 bg-slate-800/80 rounded-lg"></div>
        <div className="h-8 w-36 bg-slate-800/60 rounded-full"></div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-28 bg-slate-800 rounded"></div>
              <div className="w-8 h-8 rounded-lg bg-slate-800/80"></div>
            </div>
            <div className="h-7 w-32 bg-slate-700/80 rounded"></div>
            <div className="h-3 w-40 bg-slate-800/60 rounded"></div>
          </div>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-4">
          <div className="h-4 w-40 bg-slate-800 rounded"></div>
          <div className="h-56 bg-slate-900/50 rounded-lg"></div>
        </div>
        <div className="lg:col-span-4 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-4">
          <div className="h-4 w-32 bg-slate-800 rounded"></div>
          <div className="h-56 bg-slate-900/50 rounded-lg"></div>
        </div>
      </div>

      {/* Recent Orders Skeleton */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 space-y-4">
        <div className="h-4 w-48 bg-slate-800 rounded"></div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-800/40 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function OverviewContent({
  searchParams,
}: {
  searchParams?: { app?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appMeta = (user?.app_metadata || {}) as Record<string, any>;
  const userMeta = (user?.user_metadata || {}) as Record<string, any>;
  const role: "ADMIN" | "EMPLOYEE" = (appMeta.role || userMeta.role || "EMPLOYEE").toUpperCase() === "ADMIN" ? "ADMIN" : "EMPLOYEE";
  const userAllowedAppIds: string[] = Array.isArray(appMeta.allowed_app_ids) ? appMeta.allowed_app_ids : [];

  // 1. Fetch available apps from database once (active and inactive)
  const allApps = await prisma.application.findMany({
    select: { id: true, appCode: true, appName: true, isActive: true },
    orderBy: { appCode: "asc" },
  });

  const userScopedApps =
    role === "ADMIN"
      ? allApps
      : allApps.filter((a) => userAllowedAppIds.includes(a.id));

  const selectableApps = userScopedApps.filter((a) => a.isActive);
  const activeAppsCount = selectableApps.length;
  const totalAppsCount = userScopedApps.length;

  // Determine query condition based on role and selected app
  const requestedApp = searchParams?.app;
  let selectedAppId = "ALL";
  let appFilterCondition: any = {};

  if (role === "ADMIN") {
    if (requestedApp && requestedApp !== "ALL") {
      selectedAppId = requestedApp;
      appFilterCondition = { applicationId: requestedApp };
    }
  } else {
    // EMPLOYEE role: Scoped strictly to permitted applications
    if (userAllowedAppIds.length === 0) {
      appFilterCondition = { applicationId: "none" }; // No assigned apps
      selectedAppId = "NONE";
    } else if (requestedApp && userAllowedAppIds.includes(requestedApp)) {
      selectedAppId = requestedApp;
      appFilterCondition = { applicationId: requestedApp };
    } else {
      selectedAppId = userAllowedAppIds.length === 1 ? userAllowedAppIds[0] : "ALL";
      appFilterCondition = { applicationId: { in: userAllowedAppIds } };
    }
  }

  // Fetch real-time dashboard aggregates
  let totalVolume = 0;
  let liveVolume = 0;
  let sandboxVolume = 0;
  let livePaidCount = 0;
  let sandboxPaidCount = 0;
  let initiatedVolume = 0;
  let totalOrdersCount = 0;
  let paidOrdersCount = 0;
  let pendingOutboxCount = 0;
  let recentOrders: any[] = [];
  let volumeChartData: any[] = [];
  let paymentMethodsData: any[] = [];

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      initiatedAgg,
      paidAgg,
      outboxCount,
      orders,
      payments,
      recentPaidOrders,
    ] = await Promise.all([
      // 1. Consolidated total orders aggregate (sum + count)
      prisma.order.aggregate({
        where: appFilterCondition,
        _sum: { orderAmount: true },
        _count: { id: true },
      }),
      // 2. Consolidated paid orders aggregate (sum + count)
      prisma.order.aggregate({
        where: { ...appFilterCondition, orderStatus: "PAID" },
        _sum: { orderAmount: true },
        _count: { id: true },
      }),
      // 3. Pending webhook outbox count
      prisma.webhookOutboxQueue.count({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
      }),
      // 4. Recent orders for table
      prisma.order.findMany({
        where: appFilterCondition,
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          application: { select: { appCode: true, appName: true } },
          payments: { select: { paymentMethod: true, cfPaymentId: true }, take: 1 },
          refunds: { select: { refundStatus: true, refundAmount: true } },
        },
      }),
      // 5. Recent successful payments for method mix breakdown
      prisma.payment.findMany({
        where: {
          paymentStatus: "SUCCESS",
          ...(Object.keys(appFilterCondition).length > 0 ? { order: appFilterCondition } : {}),
        },
        take: 150,
        orderBy: { createdAt: "desc" },
        select: {
          paymentMethod: true,
          paymentGroup: true,
        },
      }),
      // 6. Paid orders within the last 7 days for volume chart and live/sandbox breakdown
      prisma.order.findMany({
        where: {
          ...appFilterCondition,
          orderStatus: "PAID",
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          orderAmount: true,
          createdAt: true,
          metadata: true,
          orderNote: true,
          cfOrderId: true,
        },
        take: 500,
      }),
    ]);

    const allPaidOrders = recentPaidOrders;
    allPaidOrders.forEach((order) => {
      const env = getOrderEnvironment(order);
      const amt = Number(order.orderAmount || 0);
      if (env === "production") {
        liveVolume += amt;
        livePaidCount += 1;
      } else {
        sandboxVolume += amt;
        sandboxPaidCount += 1;
      }
    });

    totalVolume = Number(paidAgg._sum.orderAmount || 0);
    paidOrdersCount = paidAgg._count.id || 0;
    initiatedVolume = Number(initiatedAgg._sum.orderAmount || 0);
    totalOrdersCount = initiatedAgg._count.id || 0;
    pendingOutboxCount = outboxCount;
    recentOrders = orders;

    // Real payment methods breakdown from actual successful payments
    const methodCounts: Record<string, number> = {};
    for (const p of payments) {
      const raw = (p.paymentMethod || p.paymentGroup || "").trim().toLowerCase();

      let label = "Other";
      if (raw.includes("upi")) {
        label = "UPI";
      } else if (raw.includes("card") || raw.includes("debit") || raw.includes("credit")) {
        label = "Card";
      } else if (raw.includes("net") || raw.includes("bank")) {
        label = "NetBanking";
      } else if (raw.includes("wallet") || raw.includes("app")) {
        label = "Wallet";
      } else if (raw) {
        label = raw.toUpperCase();
      }

      methodCounts[label] = (methodCounts[label] || 0) + 1;
    }

    paymentMethodsData = Object.entries(methodCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Real 7-day transaction volume based strictly on database records
    const dayMap: { [key: string]: { volume: number; orders: number } } = {};
    const daysList: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      dayMap[dateKey] = { volume: 0, orders: 0 };
      daysList.push(dateKey);
    }

    recentPaidOrders.forEach((order) => {
      const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
      if (dayMap[dateKey]) {
        dayMap[dateKey].volume += Number(order.orderAmount);
        dayMap[dateKey].orders += 1;
      }
    });

    volumeChartData = daysList.map((dateKey, index) => {
      const d = new Date(dateKey);
      const isToday = index === daysList.length - 1;
      const dayLabel = isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
      return {
        date: dayLabel,
        volume: dayMap[dateKey].volume,
        orders: dayMap[dateKey].orders,
      };
    });
  } catch (err) {
    console.error("Dashboard DB fetch error (may need migrations first):", err);
  }

  return (
    <>
      <Header title="Executive Overview & Analytics" />

      {/* Application Volume Filter Bar */}
      <AppFilterBar
        applications={selectableApps}
        selectedAppId={selectedAppId}
        userRole={role}
        isRestricted={role === "EMPLOYEE"}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title="Live Production Volume"
          value={formatCurrency(liveVolume)}
          subtitle={
            livePaidCount > 0
              ? `${livePaidCount} live orders paid`
              : "No live transactions yet"
          }
          icon={DollarSign}
        />
        <StatCard
          title="Sandbox Test Volume"
          value={formatCurrency(sandboxVolume)}
          subtitle={`${sandboxPaidCount} test orders paid`}
          icon={Activity}
        />
        <StatCard
          title={role === "ADMIN" ? "Active Tenant Apps" : "Permitted Apps"}
          value={activeAppsCount}
          subtitle={
            totalAppsCount === 0
              ? "No applications configured"
              : activeAppsCount === totalAppsCount
              ? `All ${activeAppsCount} apps active`
              : `${activeAppsCount} of ${totalAppsCount} apps active`
          }
          icon={Layers}
        />
        <StatCard
          title="Pending Outbox Webhooks"
          value={pendingOutboxCount}
          subtitle={
            pendingOutboxCount === 0
              ? "All webhooks delivered"
              : `${pendingOutboxCount} awaiting dispatch`
          }
          icon={Send}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-[var(--foreground)]">Transaction Volume</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                {selectedAppId !== "ALL"
                  ? "Processed volume for selected application"
                  : `Processed volume across ${activeAppsCount} visible applications`}
              </p>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/10 text-blue-400">
              Live INR (₹)
            </span>
          </div>
          <VolumeChart data={volumeChartData} />
        </div>

        <div className="lg:col-span-4 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-[var(--foreground)]">Payment Method Mix</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Distribution by payment type</p>
          </div>
          <MethodPieChart data={paymentMethodsData} />
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm text-[var(--foreground)]">Recent Orders & Transactions</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              {paidOrdersCount} completed • {totalOrdersCount - paidOrdersCount} awaiting payment
            </p>
          </div>
          <Link
            href="/orders"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition"
          >
            View all orders →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Application</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[var(--muted-foreground)]">
                    {role === "EMPLOYEE" && userAllowedAppIds.length === 0
                      ? "No applications assigned to your account. Please contact an admin."
                      : "No transactions found for the selected application criteria."}
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => {
                  const display = getOrderDisplayStatus(order);
                  return (
                    <tr key={order.id} className="hover:bg-slate-800/40">
                      <td className="py-3 font-mono">
                        <div className="font-medium text-[var(--foreground)] truncate max-w-[180px]" title={order.appOrderId}>
                          {order.appOrderId}
                        </div>
                        {order.payments?.[0]?.cfPaymentId && (
                          <div className="text-[10px] text-emerald-400 mt-0.5 truncate" title={`Cashfree Payment ID: ${order.payments[0].cfPaymentId}`}>
                            Pay ID: <span className="font-semibold text-emerald-300">{order.payments[0].cfPaymentId}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="font-semibold text-blue-400">
                          {order.application?.appCode}
                        </span>
                      </td>
                      <td className="py-3 text-[var(--muted-foreground)]">
                        {order.customerPhone}
                      </td>
                      <td className="py-3 font-semibold text-[var(--foreground)]">
                        {formatCurrency(order.orderAmount)}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={display.badgeStatus}>
                          {display.label}
                        </StatusBadge>
                      </td>
                      <td className="py-3 text-[var(--muted-foreground)]">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function OverviewPage(props: { searchParams?: { app?: string } }) {
  const currentAppKey = props.searchParams?.app || "ALL";
  return (
    <Suspense key={currentAppKey} fallback={<DashboardSkeleton />}>
      <OverviewContent {...props} />
    </Suspense>
  );
}

