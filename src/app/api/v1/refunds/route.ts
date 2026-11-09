import { NextRequest, NextResponse } from "next/server";
import { authenticateApplication } from "@/lib/auth";
import { RefundService } from "@/services/refund.service";
import { z } from "zod";

const refundSchema = z.object({
  order_id: z.string().min(1),
  refund_amount: z.number().positive(),
  refund_id: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const clientId = req.headers.get("x-client-id");
    const clientSecret = req.headers.get("x-client-secret");

    const app = await authenticateApplication(clientId, clientSecret);
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = refundSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const result = await RefundService.createRefund(app, {
      orderId: validation.data.order_id,
      refundAmount: validation.data.refund_amount,
      refundId: validation.data.refund_id,
      note: validation.data.note,
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

