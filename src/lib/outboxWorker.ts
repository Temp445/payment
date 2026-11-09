import crypto from "crypto";
import { prisma } from "./prisma";
import { logger } from "./logger";

export class OutboxWorker {
  private static timeoutMs = Number(process.env.OUTBOX_TIMEOUT_MS) || 4000;
  private static maxRetries = Number(process.env.OUTBOX_MAX_RETRIES) || 5;

  /**
   * Process a batch of pending webhook deliveries.
   */
  static async processBatch(limit = 20) {
    try {
      const now = new Date();

      // Find pending or retryable deliveries
      const items = await prisma.webhookOutboxQueue.findMany({
        where: {
          status: { in: ["PENDING", "PROCESSING"] },
          nextRetryAt: { lte: now },
          attempts: { lt: this.maxRetries },
        },
        include: {
          application: true,
        },
        orderBy: { createdAt: "asc" },
        take: limit,
      });

      if (items.length === 0) {
        return { processed: 0, successful: 0, failed: 0 };
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of items) {
        const result = await this.deliverItem(item);
        if (result) successCount++;
        else failCount++;
      }

      return {
        processed: items.length,
        successful: successCount,
        failed: failCount,
      };
    } catch (error) {
      logger.error("OutboxWorker.processBatch error", error);
      return { processed: 0, successful: 0, failed: 0, error };
    }
  }

  /**
   * Deliver an individual outbox item with strict 4s timeout and signature.
   */
  private static async deliverItem(item: any): Promise<boolean> {
    const webhookUrl = item.application?.webhookUrl;
    if (!webhookUrl) {
      await prisma.webhookOutboxQueue.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          lastError: "No webhookUrl configured for application",
        },
      });
      return false;
    }

    const payloadString = JSON.stringify(item.payload);
    const signature = crypto
      .createHmac("sha256", item.application.webhookSecret)
      .update(payloadString)
      .digest("hex");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hub-signature": signature,
          "x-hub-event": item.eventType,
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        await prisma.webhookOutboxQueue.update({
          where: { id: item.id },
          data: {
            status: "DELIVERED",
            responseStatus: response.status,
            updatedAt: new Date(),
          },
        });
        return true;
      } else {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      const nextAttempt = item.attempts + 1;
      const backoffSec = Math.pow(2, nextAttempt) * 10;
      const nextRetry = new Date(Date.now() + backoffSec * 1000);

      const isFinalFailure = nextAttempt >= this.maxRetries;

      await prisma.webhookOutboxQueue.update({
        where: { id: item.id },
        data: {
          attempts: nextAttempt,
          status: isFinalFailure ? "FAILED" : "PENDING",
          nextRetryAt: nextRetry,
          lastError: err.name === "AbortError" ? "Delivery timed out after 4s" : err.message,
          updatedAt: new Date(),
        },
      });

      logger.warn(`Webhook delivery failed for outbox item ${item.id}`, {
        attempt: nextAttempt,
        nextRetry,
        error: err.message,
      });

      return false;
    }
  }
}

