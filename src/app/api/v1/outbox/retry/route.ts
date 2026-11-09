import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OutboxWorker } from "@/lib/outboxWorker";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    if (id) {
      // Reset specific outbox item to PENDING
      await prisma.webhookOutboxQueue.update({
        where: { id },
        data: {
          status: "PENDING",
          nextRetryAt: new Date(),
          attempts: 0,
        },
      });
    }

    // Process immediate batch
    const result = await OutboxWorker.processBatch(10);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

