import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check total registered users in Supabase auth.users table
    let userCount = 0;
    try {
      const userCountResult = await prisma.$queryRawUnsafe<[{ count: number | bigint }]>(`
        SELECT count(*)::int as count FROM auth.users;
      `);
      userCount = Number(userCountResult[0]?.count || 0);
    } catch (countErr) {
      console.warn("Could not query auth.users count:", countErr);
    }

    const isFirstUser = userCount === 0;

    return NextResponse.json({
      success: true,
      isFirstUser,
      userCount,
    });
  } catch (err: any) {
    console.error("Failed to fetch signup status:", err);
    return NextResponse.json({
      success: true,
      isFirstUser: false,
      userCount: 1,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body || {};

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid userId is required." },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid user identifier format." },
        { status: 400 }
      );
    }

    // 1. Check total registered users in auth.users
    const userCountResult = await prisma.$queryRawUnsafe<[{ count: number | bigint }]>(`
      SELECT count(*)::int as count FROM auth.users;
    `);
    const count = Number(userCountResult[0]?.count || 0);

    // 2. Count existing administrators
    const adminCountResult = await prisma.$queryRawUnsafe<[{ count: number | bigint }]>(`
      SELECT count(*)::int as count FROM auth.users
      WHERE (raw_app_meta_data->>'role') = 'ADMIN' OR is_super_admin = true;
    `);
    const adminCount = Number(adminCountResult[0]?.count || 0);

    // Qualifies as first admin if 1 or fewer users exist, or no admin exists in the system
    const qualifiesAsFirstAdmin = count <= 1 || adminCount === 0;

    if (!qualifiesAsFirstAdmin) {
      return NextResponse.json(
        {
          success: false,
          isFirstAdmin: false,
          error: "An administrator already exists. Registration is strictly by invitation only.",
        },
        { status: 403 }
      );
    }

    // Direct database update via Prisma: elevate user to confirmed ACTIVE Master ADMIN
    const payload = JSON.stringify({
      role: "ADMIN",
      status: "ACTIVE",
      is_approved: true,
    }).replace(/'/g, "''");

    await prisma.$executeRawUnsafe(`
      UPDATE auth.users 
      SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
          raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '${payload}'::jsonb,
          raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '${payload}'::jsonb
      WHERE id = '${userId}'::uuid;
    `);

    return NextResponse.json({
      success: true,
      isFirstAdmin: true,
      message: "First user successfully registered and designated as Master System Administrator.",
    });
  } catch (err: any) {
    console.error("Failed to process administrator promotion:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to configure administrator status." },
      { status: 500 }
    );
  }
}
