import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderService } from "@/services/order.service";
import { resolveAppCashfreeEnv } from "@/lib/config";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Public, read-only endpoint used by the branded checkout page.
 * The unguessable payment_session_id acts as the access token for one order.
 * Never returns secrets - only branding, amount and status.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { session: string } }
) {
  try {
    const session = decodeURIComponent(params.session || "");
    if (!session || session.length < 20) {
      return NextResponse.json(
        { success: false, error: "Invalid checkout session" },
        { status: 400, headers: corsHeaders }
      );
    }

    const order = await prisma.order.findFirst({
      where: { paymentSessionId: session },
      include: { application: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Checkout session not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Refresh status from Cashfree (also activates subscription on localhost without webhooks)
    let status: string = order.orderStatus;
    if (order.orderStatus === "ACTIVE") {
      const live = await OrderService.getOrderStatus(
        {
          id: order.applicationId,
          appCode: order.application.appCode,
          appName: order.application.appName,
          webhookUrl: order.application.webhookUrl,
          webhookSecret: order.application.webhookSecret,
          environment: order.application.environment,
        },
        order.appOrderId
      );
      if (live?.status) status = live.status;
    }

    const app = order.application;
    const orderEnv = (order.metadata as any)?.environment;
    const isProd = orderEnv === "production" ? true : orderEnv === "sandbox" ? false : resolveAppCashfreeEnv(app.environment);
    return NextResponse.json(
      {
        success: true,
        mode: isProd ? "production" : "sandbox",
        order: {
          order_id: order.appOrderId,
          amount: Number(order.orderAmount),
          currency: order.orderCurrency,
          status,
          note: order.orderNote,
          return_url: order.returnUrl,
        },
        brand: {
          name: app.displayName || app.appName,
          logo_url: app.logoUrl,
          color: app.brandColor || "#2563eb",
        },
      },
      { headers: { ...corsHeaders, "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Unable to load checkout" },
      { status: 500, headers: corsHeaders }
    );
  }
}

