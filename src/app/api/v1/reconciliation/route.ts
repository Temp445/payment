import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth";
import { ReconciliationService } from "@/services/recon.service";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader, req)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const summary = await ReconciliationService.getReconciliationSummary();
    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader, req)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Check if triggering automated sync from Cashfree API
    if (body.action === "sync") {
      const options = body.options
        ? {
            startDate: body.options.startDate ? new Date(body.options.startDate) : undefined,
            endDate: body.options.endDate ? new Date(body.options.endDate) : undefined,
          }
        : undefined;
      const result = await ReconciliationService.syncSettlementsFromCashfree(options);
      return NextResponse.json(result, { status: 200 });
    }

    // Otherwise, manual individual record insertion
    const settlement = await ReconciliationService.recordSettlement({
      cfSettlementId: body.cfSettlementId,
      settlementAmount: body.settlementAmount,
      settlementCurrency: body.settlementCurrency || "INR",
      utrNumber: body.utrNumber,
      settlementDate: new Date(body.settlementDate || Date.now()),
      status: body.status || "SETTLED",
      rawPayload: body,
    });

    return NextResponse.json({ success: true, settlement }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
