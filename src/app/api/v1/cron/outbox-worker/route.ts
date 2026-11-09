import { NextRequest, NextResponse } from "next/server";
import { OutboxWorker } from "@/lib/outboxWorker";

export async function GET(req: NextRequest) {
  return handleOutboxProcess(req);
}

export async function POST(req: NextRequest) {
  return handleOutboxProcess(req);
}

async function handleOutboxProcess(req: NextRequest) {
  // Allow trigger via authorization header or internal query token
  const authHeader = req.headers.get("authorization");
  const authKey = req.nextUrl.searchParams.get("key");
  const masterKey = process.env.ADMIN_API_KEY;

  const isAuthorized =
    !masterKey ||
    (authHeader && authHeader.replace(/^Bearer\s+/i, "") === masterKey) ||
    authKey === masterKey;

  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await OutboxWorker.processBatch(25);
  return NextResponse.json({ success: true, ...result });
}

