import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, fullName, userId } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: "Invite token is required" }, { status: 400 });
    }

    // 1. Verify invitation record
    const invite = await prisma.userInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return NextResponse.json({ success: false, error: "Invalid invitation" }, { status: 404 });
    }

    if (invite.usedAt) {
      return NextResponse.json({ success: false, error: "This invitation has already been accepted" }, { status: 410 });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ success: false, error: "This invitation has expired" }, { status: 410 });
    }

    // 2. Prepare metadata payload
    const normalizedEmail = invite.email.trim().toLowerCase();
    const targetRole = invite.role === "ADMIN" ? "ADMIN" : "EMPLOYEE";
    const allowedApps = Array.isArray(invite.allowedAppIds) ? invite.allowedAppIds : [];

    const appMetaPayload = JSON.stringify({
      role: targetRole,
      status: "ACTIVE",
      is_approved: true,
      allowed_app_ids: allowedApps,
    }).replace(/'/g, "''");

    const userMetaPayload = JSON.stringify({
      full_name: fullName || "",
    }).replace(/'/g, "''");

    // 3. Atomically activate and confirm user in Supabase auth.users
    const updateQuery = userId
      ? `UPDATE auth.users 
         SET 
           email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
           raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '${appMetaPayload}'::jsonb,
           raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '${userMetaPayload}'::jsonb
         WHERE id = '${userId}'::uuid;`
      : `UPDATE auth.users 
         SET 
           email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
           raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '${appMetaPayload}'::jsonb,
           raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '${userMetaPayload}'::jsonb
         WHERE LOWER(email) = '${normalizedEmail}';`;

    await prisma.$executeRawUnsafe(updateQuery);

    // 4. Mark invitation as used
    await prisma.userInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    // 5. Audit Log
    await prisma.auditLog.create({
      data: {
        action: "USER_INVITE_ACCEPTED",
        entityType: "USER",
        ipAddress: req.headers.get("x-forwarded-for") || "Internal",
        requestDetails: {
          email: normalizedEmail,
          role: targetRole,
          allowedAppsCount: allowedApps.length,
          acceptedAt: new Date(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully. Account is active.",
      email: normalizedEmail,
      role: targetRole,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

