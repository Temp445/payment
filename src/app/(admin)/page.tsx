import React from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { MethodPieChart } from "@/components/dashboard/MethodPieChart";
import { StatusBadge } from "@/components/ui/Badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DollarSign, Activity, Layers, Send } from "lucide-react";
import Link from "next/link";
import { OrderService } from "@/services/order.service";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  // Fetch real-time dashboard aggregates from Supabase via Prisma
  let totalVolume = 0;
  let initiatedVolume = 0;
  let totalOrdersCount = 0;
  let paidOrdersCount = 0;
  let activeAppsCount = 0;
  let totalAppsCount = 0;
  let pendingOutboxCount = 0;
  let recentOrders: any[] = [];
  let volumeChartData: any[] = [];
  let paymentMethodsData: any[] = [];

  try {
    // 1. Auto-expire any unpaid ACTIVE orders older than 20 minutes
    await OrderService.autoExpireStaleOrders(20);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      volumeAgg,
      initiatedAgg,
      totalCount,
      paidCount,
      activeApps,
      totalApps,
      outboxCount,
      orders,
      payments,
      recentPaidOrders,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { orderStatus: "PAID" },
        _sum: { orderAmount: true },
      }),
      prisma.order.aggregate({
        _sum: { orderAmount: true },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { orderStatus: "PAID" } }),
      prisma.application.count({ where: { isActive: true } }),
      prisma.application.count(),
      prisma.webhookOutboxQueue.count({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
      }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          application: { select: { appCode: true, appName: true } },
          payments: { select: { paymentMethod: true, cfPaymentId: true }, take: 1 },
        },
      }),
      prisma.payment.findMany({
        where: { paymentStatus: "SUCCESS" },
        select: {
          paymentMethod: true,
          paymentGroup: true,
          rawWebhookPayload: true,
        },
      }),
      prisma.order.findMany({
        where: {
          orderStatus: "PAID",
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          orderAmount: true,
          createdAt: true,
        },
      }),
    ]);

    totalVolume = Number(volumeAgg._sum.orderAmount || 0);
    initiatedVolume = Number(initiatedAgg._sum.orderAmount || 0);
    totalOrdersCount = totalCount;
    paidOrdersCount = paidCount;
    activeAppsCount = activeApps;
    totalAppsCount = totalApps;
    pendingOutboxCount = outboxCount;
    recentOrders = orders;

    // Real payment methods breakdown from actual successful payments
    const methodCounts: Record<string, number> = {};
    for (const p of payments) {
      let raw = (p.paymentMethod || p.paymentGroup || "").trim().toLowerCase();
      if (!raw && p.rawWebhookPayload && typeof p.rawWebhookPayload === "object") {
        const payload: any = p.rawWebhookPayload;
        raw = (payload?.data?.payment?.payment_group || "").toLowerCase();
      }

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

  const successRate =
    totalOrdersCount > 0
      ? `${((paidOrdersCount / totalOrdersCount) * 100).toFixed(1)}%`
      : "0.0%";

  const successRateTrend =
    totalOrdersCount === 0
      ? undefined
      : paidOrdersCount > 0
      ? `${paidOrdersCount} Paid`
      : "0 Paid";

  const successRatePositive = paidOrdersCount > 0;

  return (
    <>
      <Header title="Executive Overview & Analytics" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Processed GMV"
          value={formatCurrency(totalVolume)}
          subtitle={
            totalVolume > 0
              ? "Lifetime paid revenue"
              : initiatedVolume > 0
              ? `${formatCurrency(initiatedVolume)} initiated (${totalOrdersCount} orders)`
              : "No orders created yet"
          }
          icon={DollarSign}
        />
        <StatCard
          title="Success Rate"
          value={successRate}
          subtitle={`${paidOrdersCount} of ${totalOrdersCount} orders paid`}
          icon={Activity}
          trend={successRateTrend}
          trendPositive={successRatePositive}
        />
        <StatCard
          title="Active Tenant Apps"
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
                {activeAppsCount === 1
                  ? "Processed volume for 1 active application"
                  : `Processed volume across ${activeAppsCount} active applications`}
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
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
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
          <table className="w-full text-left text-xs">
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
                    No transactions yet. Start by sending an order from APP001 or Website 01!
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/40">
                    <td className="py-3 font-mono font-medium text-[var(--foreground)]">
                      {order.appOrderId}
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
                      <StatusBadge status={order.orderStatus} />
                    </td>
                    <td className="py-3 text-[var(--muted-foreground)]">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

