import { NextRequest, NextResponse } from "next/server";
import { authenticateApplication } from "@/lib/auth";
import { OrderService } from "@/services/order.service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-client-id, x-client-secret, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(
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

    const order = await OrderService.getOrderDetails(app, params.id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, order }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleCancelOrder(req, params.id);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleCancelOrder(req, params.id);
}

async function handleCancelOrder(req: NextRequest, orderId: string) {
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

    let reason = "Order cancelled via API";
    try {
      const body = await req.json();
      if (body?.reason) reason = String(body.reason);
    } catch {
      // Body optional
    }

    const result = await OrderService.cancelOrder(app, orderId, reason);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}


