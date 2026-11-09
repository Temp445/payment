import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.webhookOutboxQueue.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        application: {
          select: {
            appCode: true,
            appName: true,
            webhookUrl: true,
          },
        },
      },
    });

    const counts = await prisma.webhookOutboxQueue.groupBy({
      by: ["status"],
      _count: true,
    });

    return NextResponse.json({
      success: true,
      counts: counts.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count }), {}),
      items,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

