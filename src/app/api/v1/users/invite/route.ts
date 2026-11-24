import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { verifyAdminAuth } from "@/lib/auth";
import { ensureHubConfigLoaded, getCachedEmailConfig } from "@/lib/config";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function verifyIsAdmin(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const role = (user.app_metadata?.role || user.user_metadata?.role || "EMPLOYEE").toUpperCase();
    if (role === "ADMIN") {
      return { authorized: true, callerUser: user };
    }
  }

  // Fallback: Check Master Admin Bearer API Key
  await ensureHubConfigLoaded();
  const authHeader = req.headers.get("authorization");
  if (authHeader && verifyAdminAuth(authHeader, req)) {
    return { authorized: true, callerUser: user || null };
  }

  return { authorized: false, callerUser: null };
}

// GET: Validate invite token
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ success: false, error: "Invite token is required" }, { status: 400 });
    }

    const invite = await prisma.userInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return NextResponse.json({ success: false, error: "Invitation not found or invalid" }, { status: 404 });
    }

    if (invite.usedAt) {
      return NextResponse.json({ success: false, error: "This invitation has already been used" }, { status: 410 });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ success: false, error: "This invitation has expired" }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      email: invite.email,
      role: invite.role,
      allowedAppIds: invite.allowedAppIds,
      createdAt: invite.createdAt,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create and dispatch new invitation (Admin only)
export async function POST(req: NextRequest) {
  try {
    const { authorized, callerUser } = await verifyIsAdmin(req);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Administrator permissions required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, role = "EMPLOYEE", allowedAppIds = [] } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ success: false, error: "A valid email address is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const targetRole = role === "ADMIN" ? "ADMIN" : "EMPLOYEE";

    // Check if user is already registered in auth.users
    const existingUsers = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email FROM auth.users WHERE LOWER(email) = $1 LIMIT 1`,
      normalizedEmail
    );

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: `A user with email "${normalizedEmail}" is already registered.` },
        { status: 409 }
      );
    }

    // Generate secure token (valid for 7 days)
    const token = `inv_${crypto.randomBytes(24).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save invitation record
    const invite = await prisma.userInvite.create({
      data: {
        email: normalizedEmail,
        role: targetRole,
        allowedAppIds: Array.isArray(allowedAppIds) ? allowedAppIds : [],
        token,
        expiresAt,
        invitedBy: callerUser?.email || "ADMIN",
      },
    });

    // Construct full shareable invite URL
    const origin = req.headers.get("origin") || req.nextUrl.origin || "https://acepaymenthub.netlify.app";
    const inviteUrl = `${origin}/invite?token=${token}`;

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: "USER_INVITED",
        entityType: "USER_INVITE",
        entityId: invite.id,
        ipAddress: req.headers.get("x-forwarded-for") || "Internal",
        requestDetails: {
          email: normalizedEmail,
          role: targetRole,
          allowedAppIds,
          invitedBy: callerUser?.email,
          expiresAt,
        },
      },
    });

    // Dispatch invite email directly to the employee
    let emailSent = false;
    let emailStatusMessage = "";

    try {
      await ensureHubConfigLoaded();
      const emailConfig = getCachedEmailConfig();
      if (emailConfig.isConfigured) {
        const emailResult = await sendInviteEmail({
          to: normalizedEmail,
          inviteUrl,
          role: targetRole,
          invitedBy: callerUser?.email || "Administrator",
          allowedAppCount: Array.isArray(allowedAppIds) ? allowedAppIds.length : 0,
        });

        emailSent = emailResult.success;
        emailStatusMessage = emailResult.success
          ? `Invitation email successfully dispatched directly to ${normalizedEmail}!`
          : `Invitation created, but email could not be sent: ${emailResult.error}`;
      } else {
        emailStatusMessage = `Invitation link created. (Configure SMTP in Settings to send emails directly to inboxes)`;
      }
    } catch (e: any) {
      emailStatusMessage = `Invitation created. Email dispatch note: ${e.message}`;
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `Invitation sent directly to ${normalizedEmail}`
        : `Invitation created for ${normalizedEmail}`,
      emailSent,
      emailStatusMessage,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        allowedAppIds: invite.allowedAppIds,
        token: invite.token,
        inviteUrl,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

