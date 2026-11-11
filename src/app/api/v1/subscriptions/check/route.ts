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

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id");
    const productCode = searchParams.get("product_code") || undefined;

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: org_id" },
        { status: 400, headers: corsHeaders }
      );
    }

    const entitlement = await SubscriptionService.checkEntitlement(app, orgId, productCode);

    return NextResponse.json(
      {
        success: true,
        app_code: app.appCode,
        organization_id: orgId,
        ...entitlement,
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

