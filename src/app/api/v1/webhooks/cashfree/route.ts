import { NextRequest, NextResponse } from "next/server";
import { WebhookService } from "@/services/webhook.service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    const result = await WebhookService.processCashfreeWebhook(
      rawBody,
      signature,
      timestamp
    );

    return NextResponse.json(
      { success: result.success, message: result.message },
      { status: result.status || (result.success ? 200 : 400) }
    );
  } catch (error: any) {
    logger.error("Cashfree webhook route unhandled error", error);
    return NextResponse.json(
      { success: false, error: "Internal processing error" },
      { status: 500 }
    );
  }
}

