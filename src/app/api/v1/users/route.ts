import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureHubConfigLoaded } from "@/lib/config";

export const dynamic = "force-dynamic";

export interface SupabaseAuthUser {
  id: string;
  email: string | null;
  role: string | null;
  email_confirmed_at: string | Date | null;
  last_sign_in_at: string | Date | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
  raw_user_meta_data: any;
  raw_app_meta_data: any;
  banned_until: string | Date | null;
  is_super_admin: boolean | null;
}

// Helper to verify caller has ADMIN permissions
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

  // Same-origin browser request from logged-in admin
  const secFetchSite = req.headers.get("sec-fetch-site");
  if ((secFetchSite === "same-origin" || secFetchSite === "same-site") && user) {
    const role = (user.app_metadata?.role || user.user_metadata?.role || "EMPLOYEE").toUpperCase();
    if (role === "ADMIN") {
      return { authorized: true, callerUser: user };
    }
  }

  return { authorized: false, callerUser: null };
}

export async function GET(req: NextRequest) {
  try {
    const { authorized } = await verifyIsAdmin(req);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Administrator permissions required." },
        { status: 403 }
      );
    }

    // 1. Fetch public signup lock status
    const signupLockConfig = await prisma.paymentHubConfig.findUnique({
      where: { key: "allow_public_signup" },
    });
    const allowPublicSignup = signupLockConfig ? signupLockConfig.value !== "false" : true;

    // 2. Query available active applications
    const availableApps = await prisma.application.findMany({
      where: { isActive: true },
      select: { id: true, appCode: true, appName: true },
      orderBy: { appCode: "asc" },
    });

    // 3. Query registered users directly from Supabase's auth.users table
    const users = await prisma.$queryRawUnsafe<SupabaseAuthUser[]>(`
      SELECT 
        id, 
        email, 
        role, 
        email_confirmed_at, 
        last_sign_in_at, 
        created_at, 
        updated_at, 
        raw_user_meta_data, 
        raw_app_meta_data,
        banned_until,
        is_super_admin
      FROM auth.users
      ORDER BY created_at DESC;
    `);

    // Format fields for frontend consumption
    const formattedUsers = (users || []).map((u) => {
      const isVerified = Boolean(u.email_confirmed_at);
      const appMeta =
        typeof u.raw_app_meta_data === "object" && u.raw_app_meta_data !== null
          ? u.raw_app_meta_data
          : {};
      const userMeta =
        typeof u.raw_user_meta_data === "object" && u.raw_user_meta_data !== null
          ? u.raw_user_meta_data
          : {};

      // Determine role: default to EMPLOYEE unless explicitly assigned ADMIN
      const role = (appMeta.role || userMeta.role || (u.is_super_admin ? "ADMIN" : "EMPLOYEE")).toUpperCase();

      // Determine approval and active status
      // Default new self-signups to PENDING_APPROVAL unless approved
      const isApproved = appMeta.is_approved === true || userMeta.is_approved === true || u.is_super_admin === true;
      const status = appMeta.status || userMeta.status || (isApproved ? "ACTIVE" : "PENDING_APPROVAL");

      const allowedAppIds = Array.isArray(appMeta.allowed_app_ids)
        ? appMeta.allowed_app_ids
        : [];

      return {
        id: u.id,
        email: u.email || "No email",
        name: userMeta.full_name || userMeta.name || userMeta.user_name || null,
        role: role === "ADMIN" ? "ADMIN" : "EMPLOYEE",
        status: status as "ACTIVE" | "DEACTIVATED" | "PENDING_APPROVAL" | "REJECTED",
        allowedAppIds,
        isApproved,
        isVerified,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        lastSignInAt: u.last_sign_in_at,
      };
    });

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length,
      allowPublicSignup,
      availableApps,
    });
  } catch (err: any) {
    console.error("Failed to query auth.users:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to retrieve user list from database",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { authorized, callerUser } = await verifyIsAdmin(req);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Administrator permissions required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, userId, role, status, allowPublicSignup } = body;

    // ACTION 1: TOGGLE PUBLIC SIGNUP LOCK
    if (action === "TOGGLE_SIGNUP_LOCK") {
      const lockVal = allowPublicSignup ? "true" : "false";
      await prisma.paymentHubConfig.upsert({
        where: { key: "allow_public_signup" },
        create: { key: "allow_public_signup", value: lockVal },
        update: { value: lockVal },
      });

      return NextResponse.json({
        success: true,
        message: allowPublicSignup
          ? "Public user registration is now UNLOCKED."
          : "Public user registration is now LOCKED. New users cannot sign up.",
        allowPublicSignup: Boolean(allowPublicSignup),
      });
    }

    // Validate target user UUID
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return NextResponse.json({ success: false, error: "Invalid target user ID" }, { status: 400 });
    }

    // Safety checks against self-modification
    if (callerUser && callerUser.id === userId) {
      if (action === "SET_STATUS" && status === "DEACTIVATED") {
        return NextResponse.json(
          { success: false, error: "You cannot deactivate your own admin account." },
          { status: 400 }
        );
      }
      if (action === "SET_ROLE" && role === "EMPLOYEE") {
        return NextResponse.json(
          { success: false, error: "You cannot demote yourself from Admin." },
          { status: 400 }
        );
      }
    }

    // ACTION 2: APPROVE USER (Admin Approval)
    if (action === "APPROVE") {
      const targetRole = role === "ADMIN" ? "ADMIN" : "EMPLOYEE";
      const payload = JSON.stringify({
        is_approved: true,
        status: "ACTIVE",
        role: targetRole,
      }).replace(/'/g, "''");

      await prisma.$executeRawUnsafe(`
        UPDATE auth.users 
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '${payload}'::jsonb 
        WHERE id = '${userId}'::uuid;
      `);

      return NextResponse.json({
        success: true,
        message: `User approved successfully as ${targetRole} and activated!`,
      });
    }

    // ACTION 3: SET ACTIVE / DEACTIVATED STATUS
    if (action === "SET_STATUS") {
      if (status !== "ACTIVE" && status !== "DEACTIVATED") {
        return NextResponse.json(
          { success: false, error: "Status must be ACTIVE or DEACTIVATED" },
          { status: 400 }
        );
      }

      const payload = JSON.stringify({
        status: status,
      }).replace(/'/g, "''");

      await prisma.$executeRawUnsafe(`
        UPDATE auth.users 
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '${payload}'::jsonb 
        WHERE id = '${userId}'::uuid;
      `);

      return NextResponse.json({
        success: true,
        message: `User status updated to ${status}.`,
      });
    }

    // ACTION 4: SET ROLE (ADMIN or EMPLOYEE)
    if (action === "SET_ROLE") {
      if (role !== "ADMIN" && role !== "EMPLOYEE") {
        return NextResponse.json(
          { success: false, error: "Role must be ADMIN or EMPLOYEE" },
          { status: 400 }
        );
      }

      const payload = JSON.stringify({
        role: role,
      }).replace(/'/g, "''");

      await prisma.$executeRawUnsafe(`
        UPDATE auth.users 
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '${payload}'::jsonb 
        WHERE id = '${userId}'::uuid;
      `);

      return NextResponse.json({
        success: true,
        message: `User role updated to ${role}.`,
      });
    }

    // ACTION 5: REJECT USER REGISTRATION
    if (action === "REJECT") {
      const payload = JSON.stringify({
        is_approved: false,
        status: "REJECTED",
      }).replace(/'/g, "''");

      await prisma.$executeRawUnsafe(`
        UPDATE auth.users 
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '${payload}'::jsonb 
        WHERE id = '${userId}'::uuid;
      `);

      return NextResponse.json({
        success: true,
        message: "User registration request has been rejected.",
      });
    }

    // ACTION 6: SET ALLOWED APPLICATIONS FOR EMPLOYEE
    if (action === "SET_ALLOWED_APPS") {
      const { allowedAppIds } = body;
      if (!Array.isArray(allowedAppIds)) {
        return NextResponse.json(
          { success: false, error: "allowedAppIds must be an array of application IDs" },
          { status: 400 }
        );
      }

      const payload = JSON.stringify({
        allowed_app_ids: allowedAppIds,
      }).replace(/'/g, "''");

      await prisma.$executeRawUnsafe(`
        UPDATE auth.users 
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '${payload}'::jsonb 
        WHERE id = '${userId}'::uuid;
      `);

      return NextResponse.json({
        success: true,
        message: "Application permissions updated successfully.",
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action requested" }, { status: 400 });
  } catch (err: any) {
    console.error("Failed to update user:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
