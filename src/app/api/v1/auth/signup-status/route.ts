import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await prisma.paymentHubConfig.findUnique({
      where: { key: "allow_public_signup" },
    });

    // Default to true if not explicitly locked to "false"
    const allowPublicSignup = config ? config.value !== "false" : true;

    return NextResponse.json({
      success: true,
      allowPublicSignup,
    });
  } catch (err: any) {
    console.error("Failed to fetch signup lock status:", err);
    // Fail safe to true
    return NextResponse.json({
      success: true,
      allowPublicSignup: true,
    });
  }
}
