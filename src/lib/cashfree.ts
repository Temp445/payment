import { Cashfree } from "cashfree-pg";
import crypto from "crypto";
import axios from "axios";
import { logger } from "./logger";
import { getCachedHubUrl } from "./config";

// Setup Cashfree SDK configuration
function getCashfreeConfig() {
  const appId = (process.env.CASHFREE_APP_ID || "").trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || "").trim();
  const isProd = (process.env.CASHFREE_ENV || "").trim().toUpperCase() === "PRODUCTION";

  Cashfree.XClientId = appId;
  Cashfree.XClientSecret = secretKey;
  Cashfree.XEnvironment = isProd
    ? Cashfree.Environment.PRODUCTION
    : Cashfree.Environment.SANDBOX;

  const baseUrl = isProd
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

  return { appId, secretKey, isProd, baseUrl };
}

export class CashfreeAdapter {
  private static apiVersion = "2023-08-01";

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
        throw new Error("Cashfree credentials (CASHFREE_APP_ID, CASHFREE_SECRET_KEY) are missing in environment");
      }

      const request = {
        order_id: params.cfOrderId,
        order_amount: params.orderAmount,
        order_currency: params.orderCurrency || "INR",
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

      const response = await Cashfree.PGCreateOrder(this.apiVersion, request);
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
      const response = await Cashfree.PGOrderFetchPayments(this.apiVersion, cfOrderId);
      return response.data;
    } catch (error: any) {
      logger.error("CashfreeAdapter.getOrderPayments failed", error?.response?.data || error);
      throw new Error(
        error?.response?.data?.message || "Failed to fetch Cashfree payments"
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
  }) {
    try {
      this.ensureConfigured();
      const request = {
        refund_amount: params.refundAmount,
        refund_id: params.refundId,
        refund_note: params.note || "Refund initiated from Payment Hub",
      };

      const response = await Cashfree.PGOrderCreateRefund(
        this.apiVersion,
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
          "x-api-version": this.apiVersion,
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
