import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | { toString(): string }): string {
  const numeric = typeof amount === "number" ? amount : parseFloat(amount.toString());
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

/**
 * Resolves whether an order was executed in 'production' or 'sandbox'.
 * Inspects order.metadata.environment, order.metadata.mode, order.orderNote, or heuristic markers.
 */
export function getOrderEnvironment(order: any): "production" | "sandbox" {
  if (!order) return "sandbox";

  // 1. Direct explicit metadata
  const meta =
    typeof order.metadata === "object" && order.metadata !== null
      ? order.metadata
      : {};
  const explicitEnv = (
    meta.environment ||
    meta.mode ||
    meta.cashfree_env ||
    meta.env
  )
    ?.toString()
    .toLowerCase();

  if (
    explicitEnv === "production" ||
    explicitEnv === "prod" ||
    explicitEnv === "live"
  ) {
    return "production";
  }
  if (explicitEnv === "sandbox" || explicitEnv === "test") {
    return "sandbox";
  }

  // 2. Inspect order note
  const note = (order.orderNote || "").toLowerCase();
  if (
    note.includes("sandbox") ||
    note.includes("test") ||
    note.includes("mock")
  ) {
    return "sandbox";
  }

  // 3. Inspect cfOrderId prefix / format if any
  const cfId = (order.cfOrderId || "").toLowerCase();
  if (
    cfId.includes("test") ||
    cfId.includes("mock") ||
    cfId.includes("sandbox")
  ) {
    return "sandbox";
  }

  // 4. Default heuristic: Check amount - small testing amounts (<= ₹1.00) are sandbox
  const amount = Number(order.orderAmount || 0);
  if (amount <= 1.0) {
    return "sandbox";
  }

  // Otherwise, default to production
  return "production";
}

/**
 * Resolves the true display status for an order based on payment and refund lifecycle.
 * If an order has a pending refund and customer hasn't received funds yet, returns REFUND_PENDING.
 * Only returns REFUNDED once the refund has been confirmed as SUCCESS by Cashfree/banking rails.
 */
export function getOrderDisplayStatus(order: any): {
  status: string;
  badgeStatus: string;
  label: string;
  isPendingRefund: boolean;
  isFullyRefunded: boolean;
  isPartiallyRefunded: boolean;
} {
  if (!order) {
    return {
      status: "UNKNOWN",
      badgeStatus: "UNKNOWN",
      label: "UNKNOWN",
      isPendingRefund: false,
      isFullyRefunded: false,
      isPartiallyRefunded: false,
    };
  }

  const refunds = order.refunds || [];
  const hasPendingRefund = refunds.some(
    (r: any) => r.refundStatus === "PENDING"
  );
  const successfulRefunds = refunds.filter(
    (r: any) => r.refundStatus === "SUCCESS"
  );
  const totalSuccessfulRefunded = successfulRefunds.reduce(
    (sum: number, r: any) => sum + Number(r.refundAmount || 0),
    0
  );
  const totalOrderAmount = Number(order.orderAmount || 0);

  // If there's an active pending refund in transit:
  if (hasPendingRefund) {
    return {
      status: "REFUND_PENDING",
      badgeStatus: "REFUND_PENDING",
      label: "REFUND PENDING",
      isPendingRefund: true,
      isFullyRefunded: false,
      isPartiallyRefunded: totalSuccessfulRefunded > 0,
    };
  }

  // If order was prematurely marked REFUNDED in database but has no successful refunds:
  if (
    order.orderStatus === "REFUNDED" &&
    refunds.length > 0 &&
    totalSuccessfulRefunded === 0
  ) {
    return {
      status: "REFUND_PENDING",
      badgeStatus: "REFUND_PENDING",
      label: "REFUND PENDING",
      isPendingRefund: true,
      isFullyRefunded: false,
      isPartiallyRefunded: false,
    };
  }

  const isFullyRefunded =
    order.orderStatus === "REFUNDED" ||
    (totalSuccessfulRefunded >= totalOrderAmount && totalOrderAmount > 0);
  const isPartiallyRefunded =
    order.orderStatus === "PARTIALLY_REFUNDED" ||
    (totalSuccessfulRefunded > 0 && totalSuccessfulRefunded < totalOrderAmount);

  if (isFullyRefunded) {
    return {
      status: "REFUNDED",
      badgeStatus: "REFUNDED",
      label: "REFUNDED",
      isPendingRefund: false,
      isFullyRefunded: true,
      isPartiallyRefunded: false,
    };
  }

  if (isPartiallyRefunded) {
    return {
      status: "PARTIALLY_REFUNDED",
      badgeStatus: "PARTIALLY_REFUNDED",
      label: "PARTIALLY REFUNDED",
      isPendingRefund: false,
      isFullyRefunded: false,
      isPartiallyRefunded: true,
    };
  }

  return {
    status: order.orderStatus,
    badgeStatus: order.orderStatus,
    label: order.orderStatus,
    isPendingRefund: false,
    isFullyRefunded: false,
    isPartiallyRefunded: false,
  };
}
