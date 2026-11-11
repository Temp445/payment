import { NextRequest, NextResponse } from "next/server";
import { OutboxWorker } from "@/lib/outboxWorker";
import { verifyAdminAuth } from "@/lib/auth";
import { getCachedAdminApiKey } from "@/lib/config";
import { SubscriptionService } from "@/services/subscription.service";

export async function GET(req: NextRequest) {
  return handleOutboxProcess(req);
}

export async function POST(req: NextRequest) {
  return handleOutboxProcess(req);
}

async function handleOutboxProcess(req: NextRequest) {
  // Allow trigger via authorization header (used by pg_net trigger) or internal query token (?key=...)
  const authHeader = req.headers.get("authorization");
  const authKey = req.nextUrl.searchParams.get("key");

  const isAuthorized =
    verifyAdminAuth(authHeader) ||
    (authKey && authKey.trim() === getCachedAdminApiKey().trim()) ||
    (authKey && authKey.trim() === (process.env.ADMIN_API_KEY || "").trim());

  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Auto-expire past-due subscriptions
  await SubscriptionService.expireStaleSubscriptions();

  const result = await OutboxWorker.processBatch(25);
  return NextResponse.json({ success: true, ...result });
}

