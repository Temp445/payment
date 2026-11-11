import { prisma } from "@/lib/prisma";
import { AuthenticatedApp } from "@/lib/auth";
import { logger } from "@/lib/logger";

export interface SubscriptionCheckResult {
  has_active_subscription: boolean;
  reason?: "ACTIVE" | "EXPIRED" | "NOT_FOUND";
  product_code?: string;
  product_name?: string;
  tier?: string;
  tier_level?: number;
  user_limit?: number;
  features?: string[];
  starts_on?: string;
  ends_on?: string;
  days_remaining?: number;
}

export class SubscriptionService {
  /**
   * Check entitlement / license for an organization under a specific tenant application
   */
  static async checkEntitlement(
    app: AuthenticatedApp,
    organizationId: string,
    productCode?: string
  ): Promise<SubscriptionCheckResult> {
    try {
      // Find the product for this application using direct raw query
      const products: any[] = productCode
        ? await prisma.$queryRawUnsafe(
            `SELECT id, product_code as "productCode", product_name as "productName"
             FROM public.products_offers
             WHERE application_id = $1 AND product_is_active = true AND product_code = $2
             LIMIT 1`,
            app.id,
            productCode
          )
        : await prisma.$queryRawUnsafe(
            `SELECT id, product_code as "productCode", product_name as "productName"
             FROM public.products_offers
             WHERE application_id = $1 AND product_is_active = true
             ORDER BY created_at ASC
             LIMIT 1`,
            app.id
          );

      if (!products || products.length === 0) {
        return {
          has_active_subscription: false,
          reason: "NOT_FOUND",
        };
      }

      const product = products[0];

      // Query user_subscriptions for this organization and product
      const subs: any[] = await prisma.$queryRawUnsafe(
        `SELECT s.id, s.offer_starts_on, s.offer_ends_on, s.offer_is_active,
                o.tier, o.tier_level, o.user_limit, o.tier_limits
         FROM public.user_subscriptions s
         JOIN public.subscription_offers o ON o.id = s.offer_id
         WHERE s.organization_id = $1 AND s.product_id = $2::uuid
         LIMIT 1`,
        organizationId,
        product.id
      );

      if (!subs || subs.length === 0) {
        return {
          has_active_subscription: false,
          reason: "NOT_FOUND",
          product_code: product.productCode,
          product_name: product.productName,
        };
      }

      const sub = subs[0];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endsOn = new Date(sub.offer_ends_on);
      endsOn.setHours(0, 0, 0, 0);

      const diffTime = endsOn.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isActive = sub.offer_is_active && daysRemaining >= 0;

      const tierLimits: any = sub.tier_limits || {};
      const features = Array.isArray(tierLimits.features) ? tierLimits.features : [];

      return {
        has_active_subscription: isActive,
        reason: isActive ? "ACTIVE" : "EXPIRED",
        product_code: product.productCode,
        product_name: product.productName,
        tier: sub.tier || "Standard",
        tier_level: sub.tier_level || 1,
        user_limit: sub.user_limit || 5,
        features,
        starts_on: sub.offer_starts_on instanceof Date ? sub.offer_starts_on.toISOString().split("T")[0] : String(sub.offer_starts_on).split("T")[0],
        ends_on: sub.offer_ends_on instanceof Date ? sub.offer_ends_on.toISOString().split("T")[0] : String(sub.offer_ends_on).split("T")[0],
        days_remaining: Math.max(0, daysRemaining),
      };
    } catch (error: any) {
      logger.error("SubscriptionService.checkEntitlement error:", error);
      return {
        has_active_subscription: false,
        reason: "NOT_FOUND",
      };
    }
  }

  /**
   * Get all active subscription plans & pricing tiers for an application
   */
  static async getAppOffers(app: AuthenticatedApp) {
    try {
      const productsRaw: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          p.id as product_id,
          p.product_code,
          p.product_name,
          COALESCE(
            json_agg(
              json_build_object(
                'offer_id', o.id::text,
                'tier', o.tier,
                'tier_level', o.tier_level,
                'price', o.offer_price,
                'currency', o.offer_currency::text,
                'period', o.offer_period,
                'period_type', o.offer_period_type,
                'user_limit', o.user_limit,
                'features', COALESCE(o.tier_limits->'features', '[]'::jsonb)
              ) ORDER BY o.tier_level ASC
            ) FILTER (WHERE o.id IS NOT NULL),
            '[]'::json
          ) as offers
        FROM public.products_offers p
        LEFT JOIN public.subscription_offers o ON o.product_id = p.id AND o.offer_is_active = true
        WHERE p.application_id = $1 AND p.product_is_active = true
        GROUP BY p.id
      `, app.id);

      return productsRaw.map((prod) => ({
        product_id: prod.product_id,
        product_code: prod.product_code,
        product_name: prod.product_name,
        offers: prod.offers || [],
      }));
    } catch (err: any) {
      logger.error("SubscriptionService.getAppOffers error:", err);
      return [];
    }
  }

  /**
   * Record a verified subscription transaction into payment_transactions
   * The Postgres trigger \`handle_subscription_activation\` will automatically activate the plan.
   */
  static async recordSubscriptionTransaction(params: {
    gatewayPaymentId: string;
    gatewayOrderId: string;
    gatewaySignature?: string;
    gatewayName?: string;
    amount: number;
    currency?: string;
    status?: string;
    receiptNumber: string;
    productId: string;
    offerId: bigint | number | string;
    offerPeriod?: number;
    offerPeriodType?: string;
    organizationId: string;
    userId?: string;
  }) {
    const result: any[] = await prisma.$queryRawUnsafe(
      `INSERT INTO public.payment_transactions (
         id, gateway_payment_id, gateway_order_id, gateway_signature, gateway_name,
         amount, currency, status, receipt_number, product_id, offer_id,
         offer_period, offer_period_type, organization_id, user_id
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4,
         $5, $6, $7, $8, $9::uuid, $10,
         $11, $12, $13, $14
       ) RETURNING *`,
      params.gatewayPaymentId,
      params.gatewayOrderId,
      params.gatewaySignature || "HUB_VERIFIED",
      params.gatewayName || "CASHFREE",
      params.amount,
      params.currency || "INR",
      params.status || "PAID",
      params.receiptNumber,
      params.productId,
      BigInt(params.offerId),
      params.offerPeriod || 1,
      params.offerPeriodType || "month",
      params.organizationId,
      params.userId || null
    );
    return result[0];
  }

  /**
   * Daily auto-expiry cron
   */
  static async expireStaleSubscriptions() {
    try {
      const result: any = await prisma.$executeRawUnsafe(`
        UPDATE public.user_subscriptions
        SET offer_is_active = false
        WHERE offer_is_active = true AND offer_ends_on < CURRENT_DATE
      `);

      if (result > 0) {
        logger.info(`Expired ${result} past-due subscriptions`);
      }
      return result;
    } catch (e: any) {
      logger.warn(`expireStaleSubscriptions error: ${e.message}`);
      return 0;
    }
  }
}

