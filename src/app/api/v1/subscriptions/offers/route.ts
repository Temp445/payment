import { NextRequest, NextResponse } from "next/server";
import { authenticateApplication } from "@/lib/auth";
import { SubscriptionService } from "@/services/subscription.service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-client-id, x-client-secret, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(req: NextRequest) {
  try {
    const clientId = req.headers.get("x-client-id");
    const clientSecret = req.headers.get("x-client-secret");

    const app = await authenticateApplication(clientId, clientSecret);
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or inactive client ID" },
        { status: 401, headers: corsHeaders }
      );
    }

    const offers = await SubscriptionService.getAppOffers(app);

    return NextResponse.json(
      {
        success: true,
        app_code: app.appCode,
        products: offers,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

