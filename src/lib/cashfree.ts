import { Cashfree } from "cashfree-pg";
import crypto from "crypto";
import axios from "axios";
import { logger } from "./logger";
import { getCachedHubUrl, getCachedCashfreeConfig } from "./config";

// Setup Cashfree SDK configuration dynamically from database or .env
function getCashfreeConfig() {
  const { appId, secretKey, isProd, baseUrl, apiVersion } = getCachedCashfreeConfig();

  Cashfree.XClientId = appId;
  Cashfree.XClientSecret = secretKey;
  Cashfree.XEnvironment = isProd
    ? Cashfree.Environment.PRODUCTION
    : Cashfree.Environment.SANDBOX;

  return { appId, secretKey, isProd, baseUrl, apiVersion };
}

export class CashfreeAdapter {
  private static getApiVersion(): string {
    return getCachedCashfreeConfig().apiVersion || "2023-08-01";
  }

  private static ensureConfigured() {
    return getCashfreeConfig();
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
  }) {
    try {
      const config = this.ensureConfigured();
      if (!config.appId || !config.secretKey) {
        throw new Error(
          "Cashfree credentials (CASHFREE_APP_ID, CASHFREE_SECRET_KEY) are missing. Please configure them in Settings or .env."
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

      const response = await Cashfree.PGCreateOrder(this.getApiVersion(), request);
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
  static async getOrderPayments(cfOrderId: string) {
    try {
      this.ensureConfigured();
      const response = await Cashfree.PGOrderFetchPayments(this.getApiVersion(), cfOrderId);
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
  static async terminateOrder(cfOrderId: string) {
    try {
      const { appId, secretKey, baseUrl } = this.ensureConfigured();
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
   * Issue a refund via Cashfree
   */
  static async createRefund(params: {
    cfOrderId: string;
    refundAmount: number;
    refundId: string;
    note?: string;
  }) {
    try {
      this.ensureConfigured();
      const request = {
        refund_amount: params.refundAmount,
        refund_id: params.refundId,
        refund_note: params.note || "Refund initiated from Payment Hub",
      };

      const response = await Cashfree.PGOrderCreateRefund(
        this.getApiVersion(),
        params.cfOrderId,
        request
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
   * Fetch settlement batches directly from Cashfree Settlements API
   */
  static async fetchSettlements(limit = 20) {
    try {
      const { appId, secretKey, baseUrl } = this.ensureConfigured();
      const response = await axios.get(`${baseUrl}/settlements`, {
        headers: {
          "x-client-id": appId,
          "x-client-secret": secretKey,
          "x-api-version": this.getApiVersion(),
        },
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      logger.error("CashfreeAdapter.fetchSettlements failed", error?.response?.data || error);
      throw new Error(
        error?.response?.data?.message || "Failed to fetch Cashfree settlements"
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
      const { secretKey } = this.ensureConfigured();
      const payload = `${timestamp}${rawBody}`;
      const expectedSignature = crypto
        .createHmac("sha256", secretKey)
        .update(payload)
        .digest("base64");

      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (err) {
      logger.error("Error verifying webhook signature", err);
      return false;
    }
  }
}
