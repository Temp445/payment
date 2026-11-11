/**
 * ==============================================================================
 * CENTRAL PAYMENT HUB - PLUG & PLAY CLIENT SDK
 * Universal TypeScript Client for All Tenant Apps (CRM, Payroll, ERP, SPAs)
 * Works for both Pure Frontend (Zero-Backend) and Full-Stack Server Apps.
 * ==============================================================================
 */

export interface PaymentHubConfig {
  hubUrl: string; // e.g. "http://localhost:3001"
  clientId: string; // e.g. "pub_live_payroll_xxxx" or "pub_live_real_estate_crm_xxxx"
}

export interface SubscriptionCheckResponse {
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

export interface PricingOffer {
  offer_id: string;
  tier: string;
  tier_level: number;
  price: number;
  currency: string;
  period: number;
  period_type: "day" | "month" | "year";
  user_limit: number;
  features: string[];
}

export interface AppProduct {
  product_id: string;
  product_code: string;
  product_name: string;
  offers: PricingOffer[];
}

export interface CheckoutParams {
  organizationId: string;
  productId: string;
  offerId: string | number;
  amount: number;
  period?: number;
  periodType?: "month" | "year" | "day";
  customer: {
    id: string;
    phone: string;
    name?: string;
    email?: string;
  };
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

export class PaymentHubClient {
  private hubUrl: string;
  private clientId: string;

  constructor(config: PaymentHubConfig) {
    this.hubUrl = config.hubUrl.replace(/\/+$/, "");
    this.clientId = config.clientId;
  }

  /**
   * 1. Check if an organization has an active license / subscription
   */
  async checkSubscription(organizationId: string): Promise<SubscriptionCheckResponse> {
    try {
      const res = await fetch(
        `${this.hubUrl}/api/v1/subscriptions/check?org_id=${encodeURIComponent(organizationId)}`,
        {
          headers: {
            "x-client-id": this.clientId,
          },
        }
      );
      return await res.json();
    } catch (error: any) {
      console.error("[PaymentHub] License check error:", error);
      return {
        has_active_subscription: false,
        reason: "NOT_FOUND",
      };
    }
  }

  /**
   * 2. Fetch all configured pricing tiers and features for this application
   */
  async getPlans(): Promise<AppProduct[]> {
    try {
      const res = await fetch(`${this.hubUrl}/api/v1/subscriptions/offers`, {
        headers: {
          "x-client-id": this.clientId,
        },
      });
      const data = await res.json();
      return data.products || [];
    } catch (error: any) {
      console.error("[PaymentHub] Fetch plans error:", error);
      return [];
    }
  }

  /**
   * 3. Launch Standard Checkout (Pure Client & Full-Stack Compatible)
   */
  async checkout(params: CheckoutParams): Promise<void> {
    try {
      const orderId = `SUB_${params.organizationId}_${Date.now()}`;

      // 1. Create order in Payment Hub
      const res = await fetch(`${this.hubUrl}/api/v1/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": this.clientId,
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: params.amount,
          order_currency: "INR",
          customer_details: {
            customer_id: params.customer.id,
            customer_phone: params.customer.phone,
            customer_name: params.customer.name || "Customer",
            customer_email: params.customer.email,
          },
          metadata: {
            organization_id: params.organizationId,
            product_id: params.productId,
            offer_id: params.offerId,
            offer_period: params.period || 1,
            offer_period_type: params.periodType || "month",
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      const paymentSessionId = data.payment_session_id || data.order?.paymentSessionId;
      if (!paymentSessionId) {
        throw new Error("Payment Hub did not return a paymentSessionId");
      }

      // 2. Open Cashfree modal SDK if available in window, or redirect
      if (typeof window !== "undefined") {
        const cashfreeModule = await import("@cashfreepayments/cashfree-js").catch(() => null);
        if (cashfreeModule && cashfreeModule.load) {
          const cashfree = await cashfreeModule.load({ mode: "sandbox" });
          const result = await cashfree.checkout({
            paymentSessionId,
            redirectTarget: "_modal",
          });

          if (result.error) {
            params.onFailure?.(result.error.message || "Payment cancelled");
            return;
          }

          // Payment succeeded or modal closed; poll status
          this.pollConfirmation(orderId, params.onSuccess, params.onFailure);
          return;
        }
      }

      // Fallback redirect if SDK not imported directly
      window.location.href = `https://sandbox.cashfree.com/pg/orders/${paymentSessionId}`;
    } catch (err: any) {
      console.error("[PaymentHub] Checkout error:", err);
      params.onFailure?.(err.message || "Failed to launch payment");
    }
  }

  /**
   * Helper: Polls order confirmation until payment is marked PAID
   */
  private pollConfirmation(
    orderId: string,
    onSuccess?: (paymentId: string) => void,
    onFailure?: (error: string) => void
  ) {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${this.hubUrl}/api/v1/orders/${orderId}/status`, {
          headers: { "x-client-id": this.clientId },
        });
        const json = await res.json();
        if (json.status === "PAID") {
          clearInterval(interval);
          onSuccess?.(json.latest_payment?.cfPaymentId || "CONFIRMED");
        } else if (attempts >= 10) {
          clearInterval(interval);
          onSuccess?.("PENDING_VERIFICATION");
        }
      } catch {
        if (attempts >= 10) {
          clearInterval(interval);
          onFailure?.("Confirmation polling timeout");
        }
      }
    }, 1500);
  }

  /**
   * 4. Feature Check Utility: Evaluates if a feature flag is unlocked in a subscription
   */
  static hasFeature(subscription: SubscriptionCheckResponse | null, featureKey: string): boolean {
    if (!subscription || !subscription.has_active_subscription) return false;
    return (subscription.features || []).includes(featureKey);
  }
}

