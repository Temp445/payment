import { OrderStatus } from "@prisma/client";

/**
 * Validates if an order state transition is permitted.
 * Protects against delayed or out-of-order webhook events (e.g. late FAILED event after PAID).
 */
export function canTransitionOrder(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  // If already at the target status, it's idempotent and allowed
  if (currentStatus === targetStatus) {
    return true;
  }

  switch (currentStatus) {
    case "CREATED":
    case "ACTIVE":
      // An active order can transition to PAID, FAILED, EXPIRED, or CANCELLED
      return ["PAID", "FAILED", "EXPIRED", "CANCELLED"].includes(targetStatus);

    case "FAILED":
      // If payment failed previously, customer may retry successfully on the same order session
      return targetStatus === "PAID";

    case "PAID":
      // PAID is terminal. It can ONLY transition to refunds.
      // Late FAILED, EXPIRED, or USER_DROPPED webhooks MUST be rejected.
      return ["PARTIALLY_REFUNDED", "REFUNDED"].includes(targetStatus);

    case "PARTIALLY_REFUNDED":
      return targetStatus === "REFUNDED";

    case "REFUNDED":
    case "EXPIRED":
    case "CANCELLED":
      // Terminal states
      return false;

    default:
      return false;
  }
}

