import { prisma } from "@/lib/prisma";
import { CashfreeAdapter } from "@/lib/cashfree";
import { AuthenticatedApp } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getCachedCashfreeConfig, ensureHubConfigLoaded } from "@/lib/config";
import { OutboxWorker } from "@/lib/outboxWorker";

export interface CreateOrderInput {
  order_id: string;
  order_amount: number;
  order_currency?: string;
  customer_details: {
    customer_id: string;
    customer_phone: string;
    customer_email?: string;
    customer_name?: string;
  };
  order_meta?: {
    return_url?: string;
    notify_url?: string;
  };
  order_note?: string;
  metadata?: Record<string, any>;
}

export class OrderService {
  /**
   * Format Cashfree order ID to ensure global uniqueness and fit 50-char constraint:
   * e.g. APP001_ORD_991283
   */
  private static formatCashfreeOrderId(appCode: string, appOrderId: string): string {
    const cleanAppCode = appCode.replace(/[^a-zA-Z0-9]/g, "").substring(0, 8);
    const cleanOrderId = appOrderId.replace(/[^a-zA-Z0-9_-]/g, "");
    const combined = `${cleanAppCode}_${cleanOrderId}`;
    return combined.substring(0, 48);
  }

  /**
   * Create an order and generate Cashfree payment session
   */
  static async createOrder(app: AuthenticatedApp, input: CreateOrderInput, hubOrigin?: string) {
    await ensureHubConfigLoaded();
    const cfOrderId = this.formatCashfreeOrderId(app.appCode, input.order_id);

    // 1. Check for existing order (Idempotency)
    const existingOrder = await prisma.order.findUnique({
      where: {
        applicationId_appOrderId: {
          applicationId: app.id,
          appOrderId: input.order_id,
        },
      },
    });

    if (existingOrder && existingOrder.paymentSessionId) {
      const { isProd } = getCachedCashfreeConfig();
      const mode = isProd ? "production" : "sandbox";

      return {
        success: true,
        isExisting: true,
        order_id: existingOrder.appOrderId,
        cf_order_id: existingOrder.cfOrderId,
        payment_session_id: existingOrder.paymentSessionId,
        checkout_url: this.checkoutUrl(hubOrigin, existingOrder.paymentSessionId),
        order_status: existingOrder.orderStatus,
        order_amount: Number(existingOrder.orderAmount),
        environment: mode,
        mode: mode,
      };
    }

    // 2. Persist initial order in Supabase via Prisma (Status: CREATED)
    const { isProd } = getCachedCashfreeConfig();
    const currentMode = isProd ? "production" : "sandbox";
    const orderMetadata = {
      ...(typeof input.metadata === "object" && input.metadata !== null
        ? input.metadata
        : {}),
      environment: currentMode,
    };

    const orderRecord = await prisma.order.upsert({
      where: {
        applicationId_appOrderId: {
          applicationId: app.id,
          appOrderId: input.order_id,
        },
      },
      create: {
        applicationId: app.id,
        appOrderId: input.order_id,
        cfOrderId: cfOrderId,
        orderAmount: input.order_amount,
        orderCurrency: input.order_currency || "INR",
        orderStatus: "CREATED",
        customerId: input.customer_details.customer_id,
        customerPhone: input.customer_details.customer_phone,
        customerEmail: input.customer_details.customer_email,
        customerName: input.customer_details.customer_name,
        orderNote: input.order_note,
        returnUrl: input.order_meta?.return_url,
        notifyUrl: input.order_meta?.notify_url,
        metadata: orderMetadata,
      },
      update: {
        orderAmount: input.order_amount,
        orderStatus: "CREATED",
        metadata: orderMetadata,
      },
    });

    // 3. Request Payment Session from Cashfree Adapter
    const cfResponse = await CashfreeAdapter.createOrder({
      cfOrderId: cfOrderId,
      orderAmount: input.order_amount,
      orderCurrency: input.order_currency,
      customer: {
        id: input.customer_details.customer_id,
        phone: input.customer_details.customer_phone,
        email: input.customer_details.customer_email,
        name: input.customer_details.customer_name,
      },
      returnUrl: input.order_meta?.return_url,
      notifyUrl: input.order_meta?.notify_url || (hubOrigin ? `${hubOrigin.replace(/\/$/, "")}/api/v1/webhooks/cashfree` : undefined),
      note: input.order_note,
    });

    const paymentSessionId = cfResponse.payment_session_id;

    // 4. Update order with payment_session_id and ACTIVE status
    await prisma.order.update({
      where: { id: orderRecord.id },
      data: {
        paymentSessionId: paymentSessionId,
        orderStatus: "ACTIVE",
      },
    });

    // 5. Record in Audit Log
    await prisma.auditLog.create({
      data: {
        applicationId: app.id,
        action: "ORDER_CREATED",
        entityType: "Order",
        entityId: orderRecord.id,
        requestDetails: {
          appOrderId: input.order_id,
          cfOrderId: cfOrderId,
          amount: input.order_amount,
          customerId: input.customer_details.customer_id,
        },
      },
    });

    logger.info(`Order created successfully: ${cfOrderId} for ${app.appCode}`);

    return {
      success: true,
      order_id: input.order_id,
      cf_order_id: cfOrderId,
      payment_session_id: paymentSessionId,
      checkout_url: paymentSessionId ? this.checkoutUrl(hubOrigin, paymentSessionId) : undefined,
      order_status: "ACTIVE",
      order_amount: input.order_amount,
      environment: currentMode,
      mode: currentMode,
    };
  }

  /** Branded hosted checkout URL (custom checkout page served by Payment Hub) */
  private static checkoutUrl(hubOrigin: string | undefined, sessionId: string): string | undefined {
    if (!hubOrigin) return undefined;
    return `${hubOrigin.replace(/\/$/, "")}/checkout/${encodeURIComponent(sessionId)}`;
  }

  /**
   * Get complete order details (Strictly tenant scoped)
   */
  static async getOrderDetails(app: AuthenticatedApp, orderId: string) {
    return prisma.order.findFirst({
      where: {
        applicationId: app.id,
        appOrderId: orderId,
      },
      include: {
        payments: true,
        refunds: true,
      },
    });
  }

  /**
   * Cancel or Abort an active order
   */
  static async cancelOrder(
    app: AuthenticatedApp,
    orderId: string,
    reason: string = "Payment aborted by customer"
  ) {
    const order = await prisma.order.findFirst({
      where: {
        applicationId: app.id,
        appOrderId: orderId,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found", status: 404 };
    }

    if (order.orderStatus === "PAID") {
      return {
        success: false,
        error: "Cannot cancel an already completed/paid order",
        status: 400,
      };
    }

    if (order.orderStatus === "CANCELLED") {
      return {
        success: true,
        order_id: order.appOrderId,
        status: "CANCELLED",
        message: "Order is already cancelled",
      };
    }

    // 1. Update order status to CANCELLED in database
    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: "CANCELLED",
      },
    });

    // 2. Audit Log
    await prisma.auditLog.create({
      data: {
        applicationId: app.id,
        action: "ORDER_CANCELLED",
        entityType: "Order",
        entityId: order.id,
        requestDetails: {
          appOrderId: order.appOrderId,
          cfOrderId: order.cfOrderId,
          reason,
        },
      },
    });

    // 3. Attempt termination on Cashfree
    if (order.cfOrderId) {
      CashfreeAdapter.terminateOrder(order.cfOrderId).catch((err) => {
        logger.warn(`Cashfree terminateOrder error: ${err.message}`);
      });
    }

    logger.info(`Order ${order.appOrderId} marked CANCELLED for app ${app.appCode}`);

    return {
      success: true,
      order_id: order.appOrderId,
      status: "CANCELLED",
      reason,
    };
  }

  /**
   * Auto-expire any unpaid ACTIVE orders older than maxAgeMinutes (default 20 minutes)
   */
  static async autoExpireStaleOrders(maxAgeMinutes = 20) {
    try {
      const threshold = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
      const result = await prisma.order.updateMany({
        where: {
          orderStatus: "ACTIVE",
          createdAt: { lt: threshold },
        },
        data: {
          orderStatus: "EXPIRED",
        },
      });
      if (result.count > 0) {
        logger.info(`Auto-expired ${result.count} stale ACTIVE orders older than ${maxAgeMinutes} minutes`);
      }
      return result.count;
    } catch (e: any) {
      logger.warn(`autoExpireStaleOrders skipped: ${e.message}`);
      return 0;
    }
  }

  /**
   * Lightweight endpoint for Mobile SDK and Client polling
   */
  static async getOrderStatus(app: AuthenticatedApp, orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        applicationId: app.id,
        appOrderId: orderId,
      },
      select: {
        id: true,
        applicationId: true,
        appOrderId: true,
        cfOrderId: true,
        orderStatus: true,
        orderAmount: true,
        metadata: true,
        updatedAt: true,
        payments: {
          select: {
            cfPaymentId: true,
            paymentStatus: true,
            paymentMethod: true,
            paymentTime: true,
            bankReference: true,
          },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) return null;

    // If order is still ACTIVE on localhost (where webhooks cannot reach), verify directly with Cashfree
    if (order.orderStatus === "ACTIVE" && order.cfOrderId) {
      try {
        const cfPayments = await CashfreeAdapter.getOrderPayments(order.cfOrderId);
        if (Array.isArray(cfPayments) && cfPayments.length > 0) {
          const successPayment = cfPayments.find(
            (p: any) => p.payment_status === "SUCCESS"
          );

          if (successPayment) {
            // Atomic state transition guard: Prevents concurrent polling requests from duplicating subscriptions or outbox entries
            const transitionResult = await prisma.order.updateMany({
              where: { id: order.id, orderStatus: "ACTIVE" },
              data: { orderStatus: "PAID" },
            });
            const isFirstToTransition = transitionResult.count > 0;

            const paymentAmount = successPayment.payment_amount ?? Number(order.orderAmount);
            const method = successPayment.payment_group || "OTHER";
            const paymentRecord = await prisma.payment.upsert({
              where: { cfPaymentId: String(successPayment.cf_payment_id) },
              update: {
                paymentStatus: "SUCCESS",
                paymentAmount: paymentAmount,
                paymentMethod: method,
                paymentGroup: method,
                bankReference: successPayment.bank_reference,
              },
              create: {
                orderId: order.id,
                cfPaymentId: String(successPayment.cf_payment_id),
                paymentAmount: paymentAmount,
                paymentStatus: "SUCCESS",
                paymentMethod: method,
                paymentGroup: method,
                bankReference: successPayment.bank_reference,
              },
            });

            order.orderStatus = "PAID";

            // Only the single request that transitioned the status executes side-effects (Outbox)
            if (isFirstToTransition) {
              const metadata: any = order.metadata || {};

              // Outbox Dispatch: Enqueue webhook notification to client app if configured
              if (app.webhookUrl) {
                try {
                  const existingOutbox = await prisma.webhookOutboxQueue.findFirst({
                    where: { orderId: order.id, eventType: "PAYMENT.SUCCESS" },
                  });
                  if (!existingOutbox) {
                    await prisma.webhookOutboxQueue.create({
                      data: {
                        applicationId: order.applicationId,
                        orderId: order.id,
                        eventType: "PAYMENT.SUCCESS",
                        payload: {
                          event_type: "PAYMENT.SUCCESS",
                          app_code: app.appCode,
                          order_id: order.appOrderId,
                          cf_order_id: order.cfOrderId,
                          amount: paymentAmount,
                          currency: "INR",
                          payment_id: String(successPayment.cf_payment_id),
                          payment_status: "SUCCESS",
                          payment_method: successPayment.payment_group || null,
                          timestamp: new Date().toISOString(),
                          metadata: metadata,
                        },
                        status: "PENDING",
                      },
                    });
                    OutboxWorker.processBatch(5).catch((err) =>
                      logger.error("Background outbox dispatch error from poll verification", err)
                    );
                  }
                } catch (outboxErr: any) {
                  logger.warn(`Outbox queue enqueue failed in getOrderStatus: ${outboxErr.message}`);
                }
              }
            }

            order.payments = [
              {
                cfPaymentId: paymentRecord.cfPaymentId,
                paymentStatus: paymentRecord.paymentStatus,
                paymentMethod: paymentRecord.paymentMethod,
                paymentTime: paymentRecord.paymentTime,
                bankReference: paymentRecord.bankReference,
              },
            ];
          } else {
            // Record non-success attempts (FAILED, USER_DROPPED)
            for (const attempt of cfPayments) {
              if (attempt.cf_payment_id) {
                const statusMap: Record<string, any> = {
                  SUCCESS: "SUCCESS",
                  FAILED: "FAILED",
                  USER_DROPPED: "USER_DROPPED",
                  PENDING: "PENDING",
                  CANCELLED: "CANCELLED",
                };
                const mappedStatus = (attempt.payment_status && statusMap[attempt.payment_status]) || "FAILED";
                const method = attempt.payment_group || "OTHER";
                const amt = attempt.payment_amount ?? Number(order.orderAmount);

                await prisma.payment.upsert({
                  where: { cfPaymentId: String(attempt.cf_payment_id) },
                  update: {
                    paymentStatus: mappedStatus,
                    paymentAmount: amt,
                    paymentMethod: method,
                    paymentGroup: method,
                    bankReference: attempt.bank_reference,
                  },
                  create: {
                    orderId: order.id,
                    cfPaymentId: String(attempt.cf_payment_id),
                    paymentAmount: amt,
                    paymentStatus: mappedStatus,
                    paymentMethod: method,
                    paymentGroup: method,
                    bankReference: attempt.bank_reference,
                  },
                });
              }
            }
          }
        }
      } catch (err: any) {
        // Fallback safely to current database state
        logger.warn(`Cashfree real-time status check skipped: ${err.message}`);
      }
    }

    return {
      order_id: order.appOrderId,
      cf_order_id: order.cfOrderId,
      status: order.orderStatus,
      amount: Number(order.orderAmount),
      latest_payment: order.payments[0] || null,
      updated_at: order.updatedAt,
    };
  }
}
