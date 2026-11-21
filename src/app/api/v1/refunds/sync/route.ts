import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, authenticateApplication } from "@/lib/auth";
import { RefundService } from "@/services/refund.service";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const isAdmin = verifyAdminAuth(authHeader, req);

    if (!isAdmin) {
      const clientId = req.headers.get("x-client-id");
      const clientSecret = req.headers.get("x-client-secret");
      const app = await authenticateApplication(clientId, clientSecret);
      if (!app) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const orderId = body.order_id || body.orderId;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "order_id is required" }, { status: 400 });
    }

    const result = await RefundService.syncRefundStatus(orderId);
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const isAdmin = verifyAdminAuth(authHeader, req);

    if (!isAdmin) {
      const clientId = req.headers.get("x-client-id");
      const clientSecret = req.headers.get("x-client-secret");
      const app = await authenticateApplication(clientId, clientSecret);
      if (!app) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const url = new URL(req.url);
    const orderId = url.searchParams.get("order_id") || url.searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ success: false, error: "order_id query param is required" }, { status: 400 });
    }

    const result = await RefundService.syncRefundStatus(orderId);
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

