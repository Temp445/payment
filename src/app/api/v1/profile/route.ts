import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const appMeta = (user.app_metadata || {}) as Record<string, any>;
    const userMeta = (user.user_metadata || {}) as Record<string, any>;

    const role = (appMeta.role || userMeta.role || "EMPLOYEE").toUpperCase();
    const isApproved = appMeta.is_approved === true || userMeta.is_approved === true;
    const status = appMeta.status || userMeta.status || (isApproved ? "ACTIVE" : "PENDING_APPROVAL");
    const name = userMeta.full_name || userMeta.name || userMeta.user_name || "";

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name,
        role,
        status,
        isApproved,
        emailConfirmedAt: user.email_confirmed_at,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
      },
    });
  } catch (err: any) {
    console.error("Failed to fetch profile:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body || {};

    if (typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Name must be a valid string." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return NextResponse.json(
        { success: false, error: "Name cannot exceed 100 characters." },
        { status: 400 }
      );
    }

    // 1. Update Supabase Auth user metadata
    const { error: updateAuthError } = await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
        name: trimmedName,
      },
    });

    if (updateAuthError) {
      console.warn("Supabase auth.updateUser warning:", updateAuthError.message);
    }

    // 2. Direct database update to ensure instant persistence in auth.users
    const escapedName = trimmedName.replace(/'/g, "''");
    const payload = JSON.stringify({
      full_name: trimmedName,
      name: trimmedName,
    }).replace(/'/g, "''");

    await prisma.$executeRawUnsafe(`
      UPDATE auth.users 
      SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '${payload}'::jsonb
      WHERE id = '${user.id}'::uuid;
    `);

    return NextResponse.json({
      success: true,
      message: "Profile name updated successfully.",
      name: trimmedName,
    });
  } catch (err: any) {
    console.error("Failed to update profile name:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update profile name." },
      { status: 500 }
    );
  }
}

