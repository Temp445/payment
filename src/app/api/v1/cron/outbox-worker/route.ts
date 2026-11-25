import { NextRequest, NextResponse } from "next/server";
import { OutboxWorker } from "@/lib/outboxWorker";
import { OrderService } from "@/services/order.service";
import { verifyAdminAuth } from "@/lib/auth";
import { getCachedAdminApiKey } from "@/lib/config";

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
    verifyAdminAuth(authHeader, req) ||
    (authKey && authKey.trim() === getCachedAdminApiKey().trim());

  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // 1. Process pending outbox webhook dispatches
  const outboxResult = await OutboxWorker.processBatch(25);

  // 2. Automatically expire stale ACTIVE orders older than 20 minutes in the background
  const expiredCount = await OrderService.autoExpireStaleOrders(20);

  return NextResponse.json({
    success: true,
    ...outboxResult,
    autoExpiredOrders: expiredCount,
  });
}

