import { prisma } from "@/lib/prisma";
import { CashfreeAdapter } from "@/lib/cashfree";
import { logger } from "@/lib/logger";

export class ReconciliationService {
  /**
   * Reconcile batch settlements into the database.
   */
  static async recordSettlement(data: {
    cfSettlementId: string;
    settlementAmount: number;
    settlementCurrency?: string;
    utrNumber?: string;
    settlementDate: Date;
    status: string;
    rawPayload?: any;
  }) {
    return prisma.settlement.upsert({
      where: { cfSettlementId: data.cfSettlementId },
      create: {
        cfSettlementId: data.cfSettlementId,
        settlementAmount: data.settlementAmount,
        settlementCurrency: data.settlementCurrency || "INR",
        utrNumber: data.utrNumber,
        settlementDate: data.settlementDate,
        status: data.status,
        rawPayload: data.rawPayload,
      },
      update: {
        status: data.status,
        utrNumber: data.utrNumber,
        rawPayload: data.rawPayload,
      },
    });
  }

  /**
   * Automatically fetch and sync settlements from Cashfree API
   */
  static async syncSettlementsFromCashfree() {
    try {
      const data = await CashfreeAdapter.fetchSettlements(30);
      const settlementsList = Array.isArray(data) ? data : data?.data || [];

      let syncedCount = 0;
      for (const item of settlementsList) {
        if (!item.cf_settlement_id) continue;

        await this.recordSettlement({
          cfSettlementId: String(item.cf_settlement_id),
          settlementAmount: Number(item.settlement_amount || item.amount || 0),
          settlementCurrency: item.currency || "INR",
          utrNumber: item.utr,
          settlementDate: item.settlement_date ? new Date(item.settlement_date) : new Date(),
          status: item.status || "SETTLED",
          rawPayload: item,
        });
        syncedCount++;
      }

      // Record in audit log
      await prisma.auditLog.create({
        data: {
          action: "SETTLEMENTS_SYNCED",
          entityType: "Settlement",
          requestDetails: { count: syncedCount },
        },
      });

      logger.info(`Synced ${syncedCount} settlements from Cashfree`);
      return { success: true, synced_count: syncedCount };
    } catch (error: any) {
      logger.error("Failed to sync settlements from Cashfree", error);
      throw error;
    }
  }

  /**
   * Fetch settlement reconciliation summary for reporting
   */
  static async getReconciliationSummary() {
    try {
      const [totalSettled, totalPaidOrders, pendingOrders] = await Promise.all([
        prisma.settlement.aggregate({
          _sum: { settlementAmount: true },
          _count: true,
        }),
        prisma.order.aggregate({
          where: { orderStatus: "PAID" },
          _sum: { orderAmount: true },
          _count: true,
        }),
        prisma.order.count({
          where: { orderStatus: "ACTIVE" },
        }),
      ]);

      return {
        settled_volume: Number(totalSettled._sum.settlementAmount || 0),
        settled_batches_count: totalSettled._count,
        total_paid_volume: Number(totalPaidOrders._sum.orderAmount || 0),
        total_paid_orders_count: totalPaidOrders._count,
        pending_unresolved_orders: pendingOrders,
      };
    } catch (error) {
      logger.error("Error fetching reconciliation summary", error);
      throw error;
    }
  }
}
