import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await prisma.paymentHubConfig.findUnique({
      where: { key: "allow_public_signup" },
    });

    let allowPublicSignup = config ? config.value !== "false" : true;

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

    // If there are zero users initially, signup must never be locked so the initial admin can register
    if (isFirstUser) {
      allowPublicSignup = true;
    }

    return NextResponse.json({
      success: true,
      allowPublicSignup,
      isFirstUser,
      userCount,
    });
  } catch (err: any) {
    console.error("Failed to fetch signup lock status:", err);
    // Fail safe to true
    return NextResponse.json({
      success: true,
      allowPublicSignup: true,
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

    // UUID format check to ensure security and prevent SQL injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid user identifier format." },
        { status: 400 }
      );
    }

    // 1. Count total registered users in auth.users
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

    // 3. Confirm target user exists
    const targetUsers = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, email FROM auth.users WHERE id = '${userId}'::uuid;
    `);
    if (!targetUsers || targetUsers.length === 0) {
      return NextResponse.json(
        { success: false, error: "User record not found." },
        { status: 404 }
      );
    }

    // 4. Verify first-user qualification
    // Only promote if this is the only registered user (count <= 1) OR no admin exists in the entire system
    const qualifiesAsFirstAdmin = count <= 1 || adminCount === 0;

    if (!qualifiesAsFirstAdmin) {
      return NextResponse.json({
        success: true,
        isFirstAdmin: false,
        message: "Existing administrator exists. Account requires administrator approval.",
      });
    }

    // 5. Promote target user to ACTIVE approved ADMIN
    const payload = JSON.stringify({
      role: "ADMIN",
      status: "ACTIVE",
      is_approved: true,
    }).replace(/'/g, "''");

    await prisma.$executeRawUnsafe(`
      UPDATE auth.users 
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '${payload}'::jsonb,
          raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '${payload}'::jsonb
      WHERE id = '${userId}'::uuid;
    `);

    return NextResponse.json({
      success: true,
      isFirstAdmin: true,
      message: "First user successfully registered and designated as System Administrator.",
    });
  } catch (err: any) {
    console.error("Failed to process first user promotion:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to configure administrator status." },
      { status: 500 }
    );
  }
}
