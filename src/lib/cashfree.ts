import crypto from "crypto";
import axios from "axios";
import { logger } from "./logger";
import {
  getCachedHubUrl,
  getCachedCashfreeConfig,
  ensureHubConfigLoaded,
  getCashfreeCredentialsForMode,
} from "./config";

// Setup Cashfree SDK configuration dynamically from database or in-memory cache
async function getCashfreeConfigAsync(isProdOverride?: boolean) {
  await ensureHubConfigLoaded();
  return getCashfreeCredentialsForMode(isProdOverride);
}

function getCashfreeConfigSync(isProdOverride?: boolean) {
  return getCashfreeCredentialsForMode(isProdOverride);
}

export class CashfreeAdapter {
  private static getApiVersion(): string {
    return getCachedCashfreeConfig().apiVersion || "2023-08-01";
  }

  private static async ensureConfigured(isProdOverride?: boolean) {
    return getCashfreeConfigAsync(isProdOverride);
  }

  private static ensureConfiguredSync(isProdOverride?: boolean) {
    return getCashfreeConfigSync(isProdOverride);
  }

  /**
   * Create order session on Cashfree
   */
  static async createOrder(params: {
    cfOrderId: string;
    orderAmount: number;
    orderCurrency?: string;
    customer: {
      id: string;
      phone: string;
      email?: string;
      name?: string;
    };
    returnUrl?: string;
    notifyUrl?: string;
    note?: string;
    isProd?: boolean;
  }) {
    try {
      const config = await this.ensureConfigured(params.isProd);
      if (!config.appId || !config.secretKey) {
        throw new Error(
          "Cashfree credentials are missing. Please configure them in Settings."
        );
      }

      // Auto-expire order after 20 minutes if unpaid
      const expiryTime = new Date(Date.now() + 20 * 60 * 1000).toISOString();

      const request: any = {
        order_id: params.cfOrderId,
        order_amount: params.orderAmount,
        order_currency: params.orderCurrency || "INR",
        order_expiry_time: expiryTime,
        customer_details: {
          customer_id: params.customer.id,
          customer_phone: params.customer.phone,
          customer_email: params.customer.email,
          customer_name: params.customer.name,
        },
        order_meta: {
          return_url: params.returnUrl,
          notify_url:
            params.notifyUrl ||
            `${getCachedHubUrl()}/api/v1/webhooks/cashfree`,
        },
        order_note: params.note,
      };

      const response = await axios.post(`${config.baseUrl}/orders`, request, {
        headers: {
          "x-client-id": config.appId,
          "x-client-secret": config.secretKey,
          "x-api-version": this.getApiVersion(),
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error: any) {
      logger.error("CashfreeAdapter.createOrder failed", error?.response?.data || error);
      throw new Error(
        error?.response?.data?.message || error.message || "Failed to create Cashfree order"
      );
    }
  }

  /**
   * Directly fetch payment status from Cashfree for verification
   */
  static async getOrderPayments(cfOrderId: string, isProd?: boolean) {
    try {
      const { appId, secretKey, baseUrl } = await this.ensureConfigured(isProd);
      const response = await axios.get(`${baseUrl}/orders/${cfOrderId}/payments`, {
        headers: {
          "x-client-id": appId,
          "x-client-secret": secretKey,
          "x-api-version": this.getApiVersion(),
        },
      });
      return response.data;
    } catch (error: any) {
      logger.error("CashfreeAdapter.getOrderPayments failed", error?.response?.data || error);
      throw new Error(
        error?.response?.data?.message || "Failed to fetch Cashfree payments"
      );
    }
  }

  /**
   * Terminate/cancel an active order on Cashfree
   */
  static async terminateOrder(cfOrderId: string, isProd?: boolean) {
    try {
      const { appId, secretKey, baseUrl } = await this.ensureConfigured(isProd);
      const response = await axios.patch(
        `${baseUrl}/orders/${cfOrderId}`,
        { order_status: "TERMINATED" },
        {
          headers: {
            "x-client-id": appId,
            "x-client-secret": secretKey,
            "x-api-version": this.getApiVersion(),
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.warn(
        `Cashfree terminateOrder skipped or failed: ${
          error?.response?.data?.message || error.message
        }`
      );
      return null;
    }
  }

  /**
   * Pay Order Session directly via Cashfree S2S Orders Sessions API
   */
  static async payOrderSession(params: {
    paymentSessionId: string;
    paymentMethod: any;
  }) {
    try {
      const { appId, secretKey, baseUrl } = await this.ensureConfigured();
      const response = await axios.post(
        `${baseUrl}/orders/sessions`,
        {
          payment_session_id: params.paymentSessionId,
          payment_method: params.paymentMethod,
        },
        {
          headers: {
            "x-client-id": appId,
            "x-client-secret": secretKey,
            "x-api-version": this.getApiVersion(),
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error("CashfreeAdapter.payOrderSession failed", error?.response?.data || error);
      throw new Error(
        error?.response?.data?.message || error.message || "Payment request failed on gateway"
      );
    }
  }

  /**
   * Issue a refund via Cashfree
   */
  static async createRefund(params: {
    cfOrderId: string;
    refundAmount: number;
    refundId: string;
    note?: string;
    isProd?: boolean;
  }) {
    try {
      const { appId, secretKey, baseUrl } = await this.ensureConfigured(params.isProd);
      const request = {
        refund_amount: params.refundAmount,
        refund_id: params.refundId,
        refund_note: params.note || "Refund initiated from Payment Hub",
      };

      const response = await axios.post(
        `${baseUrl}/orders/${params.cfOrderId}/refunds`,
        request,
        {
          headers: {
            "x-client-id": appId,
            "x-client-secret": secretKey,
            "x-api-version": this.getApiVersion(),
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error("CashfreeAdapter.createRefund failed", error?.response?.data || error);
      throw new Error(
        error?.response?.data?.message || "Failed to create Cashfree refund"
      );
    }
  }

  /**
   * Fetch a specific refund from Cashfree API
   */
  static async getOrderRefund(cfOrderId: string, cfRefundId: string, isProd?: boolean) {
    try {
      const { baseUrl, appId, secretKey } = await this.ensureConfigured(isProd);
      const response = await axios.get(
        `${baseUrl}/orders/${cfOrderId}/refunds/${cfRefundId}`,
        {
          headers: {
            "x-client-id": appId,
            "x-client-secret": secretKey,
            "x-api-version": this.getApiVersion(),
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error("CashfreeAdapter.getOrderRefund failed", error?.response?.data || error);
      throw new Error(
        error?.response?.data?.message || "Failed to fetch Cashfree refund details"
      );
    }
  }

  /**
   * Fetch all refunds for an order from Cashfree API
   */
  static async getOrderRefunds(cfOrderId: string, isProd?: boolean) {
    try {
      const { baseUrl, appId, secretKey } = await this.ensureConfigured(isProd);
      const response = await axios.get(
        `${baseUrl}/orders/${cfOrderId}/refunds`,
        {
          headers: {
            "x-client-id": appId,
            "x-client-secret": secretKey,
            "x-api-version": this.getApiVersion(),
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error("CashfreeAdapter.getOrderRefunds failed", error?.response?.data || error);
      return [];
    }
  }

  /**
   * Fetch settlement batches directly from Cashfree Settlements API
   */
  static async fetchSettlements(
    limit = 20,
    options?: { startDate?: Date; endDate?: Date }
  ) {
    try {
      const { appId, secretKey, baseUrl } = await this.ensureConfigured();

      const endDate = options?.endDate || new Date();
      const startDate =
        options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const formattedStartDate = startDate.toISOString().split(".")[0] + "Z";
      const formattedEndDate = endDate.toISOString().split(".")[0] + "Z";

      const response = await axios.post(
        `${baseUrl}/settlements`,
        {
          pagination: { limit },
          filters: {
            start_date: formattedStartDate,
            end_date: formattedEndDate,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-client-id": appId,
            "x-client-secret": secretKey,
            "x-api-version": this.getApiVersion(),
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error("CashfreeAdapter.fetchSettlements failed", error?.response?.data || error);
      throw new Error(
        error?.response?.data?.message || error?.message || "Failed to fetch Cashfree settlements"
      );
    }
  }

  /**
   * Verify HMAC-SHA256 signature on incoming Cashfree webhook
   */
  static verifyWebhookSignature(
    rawBody: string,
    signature: string,
    timestamp: string
  ): boolean {
    if (!signature || !timestamp || !rawBody) {
      return false;
    }

    try {
      const cfg = getCachedCashfreeConfig();
      const candidateKeys = Array.from(
        new Set([cfg.secretKey, cfg.prodSecretKey, cfg.testSecretKey].filter(Boolean))
      );
      const payload = `${timestamp}${rawBody}`;
      const signatureBuffer = Buffer.from(signature);

      for (const secretKey of candidateKeys) {
        const expectedSignature = crypto
          .createHmac("sha256", secretKey)
          .update(payload)
          .digest("base64");
        const expectedBuffer = Buffer.from(expectedSignature);
        if (
          signatureBuffer.length === expectedBuffer.length &&
          crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
        ) {
          return true;
        }
      }
      return false;
    } catch (err) {
      logger.error("Error verifying webhook signature", err);
      return false;
    }
  }
}
