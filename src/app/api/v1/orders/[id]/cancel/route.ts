import { NextRequest, NextResponse } from "next/server";
import { authenticateApplication } from "@/lib/auth";
import { OrderService } from "@/services/order.service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-client-id, x-client-secret, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = req.headers.get("x-client-id");
    const clientSecret = req.headers.get("x-client-secret");

    const app = await authenticateApplication(clientId, clientSecret);
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    let reason = "Payment aborted by user";
    try {
      const body = await req.json();
      if (body?.reason) reason = String(body.reason);
    } catch {
      // Body is optional
    }

    const result = await OrderService.cancelOrder(app, params.id, reason);
    const status = (result as any).status === 400 || (result as any).status === 404 ? (result as any).status : 200;

    return NextResponse.json(result, { status, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

