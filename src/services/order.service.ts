import { prisma } from "@/lib/prisma";
import { CashfreeAdapter } from "@/lib/cashfree";
import { AuthenticatedApp } from "@/lib/auth";
import { logger } from "@/lib/logger";

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
      return {
        success: true,
        isExisting: true,
        order_id: existingOrder.appOrderId,
        cf_order_id: existingOrder.cfOrderId,
        payment_session_id: existingOrder.paymentSessionId,
        order_status: existingOrder.orderStatus,
        order_amount: Number(existingOrder.orderAmount),
      };
    }

    // 2. Persist initial order in Supabase via Prisma (Status: CREATED)
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
        metadata: input.metadata || {},
      },
      update: {
        orderAmount: input.order_amount,
        orderStatus: "CREATED",
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
      order_status: "ACTIVE",
      order_amount: input.order_amount,
    };
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
   * Lightweight endpoint for Mobile SDK polling
   */
  static async getOrderStatus(app: AuthenticatedApp, orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        applicationId: app.id,
        appOrderId: orderId,
      },
      select: {
        appOrderId: true,
        cfOrderId: true,
        orderStatus: true,
        orderAmount: true,
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
