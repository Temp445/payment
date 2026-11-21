import { prisma } from "@/lib/prisma";
import { CashfreeAdapter } from "@/lib/cashfree";
import { AuthenticatedApp } from "@/lib/auth";
import { logger } from "@/lib/logger";

export class RefundService {
  /**
   * Initiate a refund for an order (Strictly tenant scoped or admin)
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
    // 1. Locate order (supports matching by either appOrderId or cfOrderId)
    const trimmedId = params.orderId.trim();
    const order = await prisma.order.findFirst({
      where: {
        applicationId: app.id,
        OR: [
          { appOrderId: trimmedId },
          { cfOrderId: trimmedId },
        ],
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

      // NOTE: Only mark order as REFUNDED / PARTIALLY_REFUNDED if the refund was immediately confirmed as SUCCESS by Cashfree.
      // If cfStatus is PENDING (funds clearing banking rails), the order remains PAID and its effective display status is REFUND_PENDING!
      const targetOrderStatus =
        cfStatus === "SUCCESS"
          ? isFullRefund
            ? "REFUNDED"
            : "PARTIALLY_REFUNDED"
          : order.orderStatus;

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
            orderStatus: targetOrderStatus,
          },
        }),
        // Record in Audit Log
        prisma.auditLog.create({
          data: {
            applicationId: app.id,
            action: `REFUND_INITIATED_${cfStatus}`,
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

      logger.info(
        `Refund ${cfRefundId} processed for order ${order.cfOrderId} with status ${cfStatus}`
      );

      return {
        success: true,
        refund_id: cfRefundId,
        refund_amount: params.refundAmount,
        refund_status: cfStatus,
        order_status:
          cfStatus === "SUCCESS"
            ? isFullRefund
              ? "REFUNDED"
              : "PARTIALLY_REFUNDED"
            : "REFUND_PENDING",
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
   * Sync refund status with Cashfree PG live API
   */
  static async syncRefundStatus(orderIdOrAppOrderId: string) {
    const trimmedId = orderIdOrAppOrderId.trim();
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ appOrderId: trimmedId }, { cfOrderId: trimmedId }],
      },
      include: {
        application: true,
        refunds: true,
        payments: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${trimmedId} not found`);
    }

    const cfRefunds = await CashfreeAdapter.getOrderRefunds(order.cfOrderId);
    if (!Array.isArray(cfRefunds) || cfRefunds.length === 0) {
      return {
        orderId: order.id,
        appOrderId: order.appOrderId,
        status: order.orderStatus,
        synced: false,
        message: "No refunds recorded on Cashfree gateway",
      };
    }

    let hasAnySuccess = false;
    let hasAnyPending = false;
    let totalSuccessfulRefund = 0;

    for (const cfRf of cfRefunds) {
      const rfStatus =
        cfRf.refund_status === "SUCCESS"
          ? "SUCCESS"
          : cfRf.refund_status === "FAILED"
          ? "FAILED"
          : "PENDING";

      if (rfStatus === "SUCCESS") {
        hasAnySuccess = true;
        totalSuccessfulRefund += Number(cfRf.refund_amount || 0);
      } else if (rfStatus === "PENDING") {
        hasAnyPending = true;
      }

      // Upsert or update local refund record
      const existing = order.refunds.find(
        (r) =>
          r.cfRefundId === cfRf.refund_id ||
          r.cfRefundId === String(cfRf.cf_refund_id)
      );

      if (existing) {
        await prisma.refund.update({
          where: { id: existing.id },
          data: {
            refundStatus: rfStatus,
            rawResponse: JSON.parse(JSON.stringify(cfRf)),
          },
        });
      } else {
        await prisma.refund.create({
          data: {
            orderId: order.id,
            cfRefundId: cfRf.refund_id || String(cfRf.cf_refund_id),
            refundAmount: cfRf.refund_amount,
            refundCurrency: cfRf.refund_currency || "INR",
            refundNote: cfRf.refund_note || "Synced from Cashfree",
            refundStatus: rfStatus,
            rawResponse: JSON.parse(JSON.stringify(cfRf)),
          },
        });
      }
    }

    const orderAmount = Number(order.orderAmount || 0);
    let finalOrderStatus = order.orderStatus;

    if (totalSuccessfulRefund >= orderAmount && orderAmount > 0) {
      finalOrderStatus = "REFUNDED";
    } else if (totalSuccessfulRefund > 0) {
      finalOrderStatus = "PARTIALLY_REFUNDED";
    } else if (
      order.orderStatus === "REFUNDED" &&
      hasAnyPending &&
      !hasAnySuccess
    ) {
      // Correct any legacy records that were prematurely marked REFUNDED while still pending
      finalOrderStatus = "PAID";
    }

    if (finalOrderStatus !== order.orderStatus) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          orderStatus: finalOrderStatus,
        },
      });
    }

    return {
      orderId: order.id,
      appOrderId: order.appOrderId,
      orderStatus: finalOrderStatus,
      displayStatus:
        hasAnyPending && !hasAnySuccess ? "REFUND_PENDING" : finalOrderStatus,
      refunds: cfRefunds,
      synced: true,
    };
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
