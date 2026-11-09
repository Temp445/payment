import { prisma } from "@/lib/prisma";
import { CashfreeAdapter } from "@/lib/cashfree";
import { AuthenticatedApp } from "@/lib/auth";
import { logger } from "@/lib/logger";

export class RefundService {
  /**
   * Initiate a refund for an order (Strictly tenant scoped)
   */
  static async createRefund(
    app: AuthenticatedApp,
    params: {
      orderId: string;
      refundAmount: number;
      refundId?: string;
      note?: string;
    }
  ) {
    // 1. Locate order
    const order = await prisma.order.findFirst({
      where: {
        applicationId: app.id,
        appOrderId: params.orderId,
      },
      include: {
        payments: {
          where: { paymentStatus: "SUCCESS" },
        },
        refunds: {
          where: { refundStatus: { in: ["SUCCESS", "PENDING"] } },
        },
      },
    });

    if (!order) {
      throw new Error(`Order ${params.orderId} not found`);
    }

    if (order.orderStatus !== "PAID" && order.orderStatus !== "PARTIALLY_REFUNDED") {
      throw new Error(`Cannot refund order in ${order.orderStatus} state`);
    }

    // 2. Validate refund balance
    const totalPaid = order.payments.reduce(
      (sum, p) => sum + Number(p.paymentAmount),
      0
    );
    const totalRefunded = order.refunds.reduce(
      (sum, r) => sum + Number(r.refundAmount),
      0
    );
    const availableBalance = totalPaid - totalRefunded;

    if (params.refundAmount <= 0 || params.refundAmount > availableBalance) {
      throw new Error(
        `Invalid refund amount. Available balance to refund is ₹${availableBalance.toFixed(2)}`
      );
    }

    const cfRefundId = params.refundId || `REF_${Date.now()}`;

    // 3. Persist pending refund in Prisma
    const refundRecord = await prisma.refund.create({
      data: {
        orderId: order.id,
        cfRefundId: cfRefundId,
        refundAmount: params.refundAmount,
        refundCurrency: order.orderCurrency,
        refundNote: params.note || "Refund initiated from Payment Hub",
        refundStatus: "PENDING",
      },
    });

    // 4. Call Cashfree Adapter
    try {
      const cfResponse = await CashfreeAdapter.createRefund({
        cfOrderId: order.cfOrderId,
        refundAmount: params.refundAmount,
        refundId: cfRefundId,
        note: params.note,
      });

      const cfStatus = cfResponse.refund_status === "SUCCESS" ? "SUCCESS" : "PENDING";
      const isFullRefund = params.refundAmount >= availableBalance;

      // Update refund and order status
      await prisma.$transaction([
        prisma.refund.update({
          where: { id: refundRecord.id },
          data: {
            refundStatus: cfStatus,
            rawResponse: JSON.parse(JSON.stringify(cfResponse)),
          },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: {
            orderStatus: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
          },
        }),
        // Record in Audit Log
        prisma.auditLog.create({
          data: {
            applicationId: app.id,
            action: "REFUND_INITIATED",
            entityType: "Refund",
            entityId: refundRecord.id,
            requestDetails: {
              appOrderId: order.appOrderId,
              cfRefundId,
              amount: params.refundAmount,
              status: cfStatus,
            },
          },
        }),
      ]);

      logger.info(`Refund ${cfRefundId} processed for order ${order.cfOrderId}`);

      return {
        success: true,
        refund_id: cfRefundId,
        refund_amount: params.refundAmount,
        refund_status: cfStatus,
        order_status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      };
    } catch (err: any) {
      await prisma.refund.update({
        where: { id: refundRecord.id },
        data: {
          refundStatus: "FAILED",
          rawResponse: { error: err.message },
        },
      });
      throw err;
    }
  }

  /**
   * List refunds (Tenant scoped)
   */
  static async listRefunds(app: AuthenticatedApp) {
    return prisma.refund.findMany({
      where: {
        order: {
          applicationId: app.id,
        },
      },
      include: {
        order: {
          select: {
            appOrderId: true,
            cfOrderId: true,
            orderAmount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
