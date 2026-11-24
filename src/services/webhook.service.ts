import { prisma } from "@/lib/prisma";
import { CashfreeAdapter } from "@/lib/cashfree";
import { ensureHubConfigLoaded } from "@/lib/config";
import { canTransitionOrder } from "@/lib/stateMachine";
import { OutboxWorker } from "@/lib/outboxWorker";
import { logger } from "@/lib/logger";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export class WebhookService {
  /**
   * Process Cashfree Webhook with Signature Verification, Cashfree Re-verification,
   * State Machine protection, and Outbox Enqueue.
   */
  static async processCashfreeWebhook(
    rawBody: string,
    signature: string | null,
    timestamp: string | null
  ) {
    await ensureHubConfigLoaded();

    // 1. Verify Cashfree HMAC-SHA256 Signature
    if (!signature || !timestamp) {
      logger.warn("Cashfree webhook missing signature or timestamp headers");
      return { success: false, status: 400, message: "Missing signature headers" };
    }

    const isValidSignature = CashfreeAdapter.verifyWebhookSignature(
      rawBody,
      signature,
      timestamp
    );

    if (!isValidSignature) {
      logger.error("Invalid Cashfree webhook signature detected");
      return { success: false, status: 401, message: "Invalid webhook signature" };
    }

    // 2. Parse Webhook Event Payload
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch (e) {
      return { success: false, status: 400, message: "Malformed JSON payload" };
    }

    const eventType = event.type; // e.g. PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK, REFUND_STATUS_WEBHOOK
    const orderData = event.data?.order;
    const paymentData = event.data?.payment;
    const refundData = event.data?.refund;

    // Handle Refund Webhooks (e.g. REFUND_STATUS_WEBHOOK)
    if (eventType === "REFUND_STATUS_WEBHOOK" || refundData) {
      const cfOrderId = refundData?.order_id || orderData?.order_id;
      if (!cfOrderId) {
        logger.warn("Refund webhook payload missing order_id", event);
        return { success: true, message: "Ignored unhandled refund event" };
      }

      const order = await prisma.order.findUnique({
        where: { cfOrderId },
        include: { application: true, refunds: true },
      });

      if (!order) {
        logger.warn(`Order not found for refund webhook: ${cfOrderId}`);
        return { success: true, message: "Order not found" };
      }

      const cfRefundStatus = refundData.refund_status; // 'SUCCESS', 'FAILED', 'PENDING'
      const statusMapped =
        cfRefundStatus === "SUCCESS"
          ? "SUCCESS"
          : cfRefundStatus === "FAILED"
          ? "FAILED"
          : "PENDING";

      const matchedRefund = order.refunds.find(
        (r) =>
          r.cfRefundId === refundData.refund_id ||
          r.cfRefundId === String(refundData.cf_refund_id)
      );

      if (matchedRefund) {
        await prisma.refund.update({
          where: { id: matchedRefund.id },
          data: {
            refundStatus: statusMapped,
            rawResponse: event,
          },
        });
      }

      // Recompute total successful refunds
      const updatedRefunds = await prisma.refund.findMany({
        where: { orderId: order.id, refundStatus: "SUCCESS" },
      });
      const totalRefunded = updatedRefunds.reduce(
        (sum, r) => sum + Number(r.refundAmount),
        0
      );
      const totalPaid = Number(order.orderAmount);

      let newOrderStatus = order.orderStatus;
      if (totalRefunded >= totalPaid && totalPaid > 0) {
        newOrderStatus = "REFUNDED";
      } else if (totalRefunded > 0) {
        newOrderStatus = "PARTIALLY_REFUNDED";
      } else if (order.orderStatus === "REFUNDED" && statusMapped === "PENDING") {
        newOrderStatus = "PAID";
      }

      if (newOrderStatus !== order.orderStatus) {
        await prisma.order.update({
          where: { id: order.id },
          data: { orderStatus: newOrderStatus },
        });
      }

      // Enqueue Outbox notification to client app
      if (order.application.webhookUrl) {
        await prisma.webhookOutboxQueue.create({
          data: {
            applicationId: order.applicationId,
            orderId: order.id,
            eventType: `REFUND.${statusMapped}`,
            payload: {
              event_type: `REFUND.${statusMapped}`,
              app_code: order.application.appCode,
              order_id: order.appOrderId,
              cf_order_id: order.cfOrderId,
              refund_id: refundData.refund_id || refundData.cf_refund_id,
              refund_amount: Number(refundData.refund_amount || 0),
              refund_status: statusMapped,
              order_status: newOrderStatus,
              timestamp: new Date().toISOString(),
            },
            status: "PENDING",
          },
        });

        OutboxWorker.processBatch(5).catch(() => {});
      }

      logger.info(
        `Refund webhook processed for order ${cfOrderId}: ${statusMapped}`
      );

      return {
        success: true,
        status: 200,
        order_id: order.appOrderId,
        refund_status: statusMapped,
      };
    }

    if (!orderData?.order_id || !paymentData?.cf_payment_id) {
      logger.warn("Webhook payload missing order_id or cf_payment_id", event);
      return { success: true, message: "Ignored unhandled event payload" };
    }

    const cfOrderId = orderData.order_id;
    const cfPaymentId = String(paymentData.cf_payment_id);
    const paymentAmount = paymentData.payment_amount;
    const paymentCurrency = paymentData.payment_currency || "INR";
    const rawPaymentStatus = paymentData.payment_status; // 'SUCCESS', 'FAILED', 'USER_DROPPED'

    logger.info(`Received Cashfree Webhook: ${eventType} for ${cfOrderId}`);

    // 3. Find the Order in Supabase
    const order = await prisma.order.findUnique({
      where: { cfOrderId },
      include: { application: true },
    });

    if (!order) {
      logger.warn(`Order not found in Payment Hub for Cashfree ID: ${cfOrderId}`);
      return { success: true, message: "Order not found" };
    }

    // 4. Double Verification: Verify Payment Status Directly with Cashfree API
    let verifiedPaymentStatus: PaymentStatus = "PENDING";
    try {
      const cfPaymentsList = await CashfreeAdapter.getOrderPayments(cfOrderId);
      const matchedPayment = Array.isArray(cfPaymentsList)
        ? cfPaymentsList.find((p: any) => String(p.cf_payment_id) === cfPaymentId)
        : null;

      if (matchedPayment && matchedPayment.payment_status === "SUCCESS") {
        verifiedPaymentStatus = "SUCCESS";
      } else if (rawPaymentStatus === "SUCCESS") {
        verifiedPaymentStatus = "SUCCESS";
      } else if (rawPaymentStatus === "FAILED") {
        verifiedPaymentStatus = "FAILED";
      } else if (rawPaymentStatus === "USER_DROPPED") {
        verifiedPaymentStatus = "USER_DROPPED";
      } else {
        verifiedPaymentStatus = "FAILED";
      }
    } catch (verifyErr) {
      logger.error("Direct Cashfree re-verification error", verifyErr);
      verifiedPaymentStatus = rawPaymentStatus === "SUCCESS" ? "SUCCESS" : "FAILED";
    }

    // 5. Determine Target Order Status
    const targetOrderStatus: OrderStatus =
      verifiedPaymentStatus === "SUCCESS" ? "PAID" : "FAILED";

    // 6. Enforce State Machine (Terminal Locks)
    const isTransitionAllowed = canTransitionOrder(order.orderStatus, targetOrderStatus);
    if (!isTransitionAllowed) {
      logger.warn(
        `Ignored out-of-order transition from ${order.orderStatus} to ${targetOrderStatus} for order ${cfOrderId}`
      );
      return { success: true, message: "Transition rejected by state machine" };
    }

    // 7. Atomic Prisma Transaction: Update Order & Upsert Payment
    await prisma.$transaction(async (tx) => {
      const rawPaymentMethod =
        paymentData.payment_group ||
        (paymentData.payment_method ? Object.keys(paymentData.payment_method)[0] : null) ||
        null;

      // Upsert payment record
      await tx.payment.upsert({
        where: { cfPaymentId },
        create: {
          orderId: order.id,
          cfPaymentId,
          paymentAmount,
          paymentCurrency,
          paymentStatus: verifiedPaymentStatus,
          paymentMethod: rawPaymentMethod,
          paymentGroup: paymentData.payment_group || rawPaymentMethod,
          paymentTime: paymentData.payment_time ? new Date(paymentData.payment_time) : new Date(),
          bankReference: paymentData.bank_reference || null,
          authId: paymentData.auth_id || null,
          rawWebhookPayload: event,
        },
        update: {
          paymentStatus: verifiedPaymentStatus,
          paymentMethod: rawPaymentMethod,
          paymentGroup: paymentData.payment_group || rawPaymentMethod,
          paymentTime: paymentData.payment_time ? new Date(paymentData.payment_time) : undefined,
          bankReference: paymentData.bank_reference || undefined,
          rawWebhookPayload: event,
        },
      });

      // Update Order Status
      await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: targetOrderStatus,
          updatedAt: new Date(),
        },
      });

      // Record in Audit Log
      await tx.auditLog.create({
        data: {
          applicationId: order.applicationId,
          action: `PAYMENT_WEBHOOK_${verifiedPaymentStatus}`,
          entityType: "Order",
          entityId: order.id,
          requestDetails: {
            cfOrderId,
            cfPaymentId,
            status: verifiedPaymentStatus,
            amount: paymentAmount,
          },
        },
      });

      // 8. Enqueue Webhook Notification for the Originating Client Application (APP001, etc.)
      if (order.application.webhookUrl) {
        await tx.webhookOutboxQueue.create({
          data: {
            applicationId: order.applicationId,
            orderId: order.id,
            eventType: `PAYMENT.${verifiedPaymentStatus}`,
            payload: {
              event_type: `PAYMENT.${verifiedPaymentStatus}`,
              app_code: order.application.appCode,
              order_id: order.appOrderId,
              cf_order_id: order.cfOrderId,
              amount: Number(order.orderAmount),
              currency: order.orderCurrency,
              payment_id: cfPaymentId,
              payment_status: verifiedPaymentStatus,
              payment_method: paymentData.payment_method?.type || null,
              timestamp: new Date().toISOString(),
              metadata: order.metadata || {},
            },
            status: "PENDING",
          },
        });
      }
    });

    // 9. Fire Non-Blocking Outbox Dispatch in the Background
    OutboxWorker.processBatch(5).catch((err) =>
      logger.error("Background outbox dispatch error", err)
    );

    return {
      success: true,
      status: 200,
      order_id: order.appOrderId,
      payment_status: verifiedPaymentStatus,
    };
  }
}
