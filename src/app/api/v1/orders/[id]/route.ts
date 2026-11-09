import { NextRequest, NextResponse } from "next/server";
import { authenticateApplication } from "@/lib/auth";
import { OrderService } from "@/services/order.service";

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
        { status: 401 }
      );
    }

    const order = await OrderService.getOrderDetails(app, params.id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

