import { NextRequest, NextResponse } from "next/server";
import { authenticateApplication, verifyAdminAuth } from "@/lib/auth";
import { RefundService } from "@/services/refund.service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const refundSchema = z.object({
  order_id: z.string().min(1),
  refund_amount: z.number().positive(),
  refund_id: z.string().optional(),
  note: z.string().optional(),
  app_code: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const isAdmin = verifyAdminAuth(authHeader, req);

    const body = await req.json();
    const validation = refundSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { order_id, refund_amount, refund_id, note, app_code } = validation.data;
    const trimmedOrderId = order_id.trim();

    if (isAdmin) {
      // Admin dashboard or master API key: locate the order across any tenant app or filtered by app_code
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { appOrderId: trimmedOrderId },
            { cfOrderId: trimmedOrderId },
          ],
          ...(app_code ? { application: { appCode: app_code.trim() } } : {}),
        },
        include: {
          application: true,
        },
      });

      if (!order) {
        return NextResponse.json(
          {
            success: false,
            error: `Order "${trimmedOrderId}" not found${app_code ? ` for application ${app_code}` : ""}.`,
          },
          { status: 404 }
        );
      }

      const result = await RefundService.createRefund(order.application, {
        orderId: trimmedOrderId,
        refundAmount: refund_amount,
        refundId: refund_id,
        note,
      });

      return NextResponse.json(result, { status: 201 });
    }

    // Otherwise, authenticate via tenant client credentials
    const clientId = req.headers.get("x-client-id");
    const clientSecret = req.headers.get("x-client-secret");

    const app = await authenticateApplication(clientId, clientSecret);
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await RefundService.createRefund(app, {
      orderId: trimmedOrderId,
      refundAmount: refund_amount,
      refundId: refund_id,
      note,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const isAdmin = verifyAdminAuth(authHeader, req);

    if (isAdmin) {
      const refunds = await prisma.refund.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            include: {
              application: { select: { appCode: true, appName: true } },
            },
          },
        },
      });
      return NextResponse.json({ success: true, count: refunds.length, refunds });
    }

    const clientId = req.headers.get("x-client-id");
    const clientSecret = req.headers.get("x-client-secret");

    const app = await authenticateApplication(clientId, clientSecret);
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const refunds = await RefundService.listRefunds(app);
    return NextResponse.json({ success: true, count: refunds.length, refunds });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
