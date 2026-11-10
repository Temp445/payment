import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth";
import { getHubConfig, saveHubConfig } from "@/lib/config";
import { z } from "zod";

const settingsSchema = z.object({
  hubUrl: z
    .string()
    .trim()
    .refine((val) => {
      const parts = val.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length === 0) return false;
      return parts.every((p) => {
        try {
          const u = new URL(p);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      });
    }, "Each Hub URL must be a valid URL starting with http:// or https:// (separate multiple URLs with commas)")
    .optional(),
  adminApiKey: z
    .string()
    .trim()
    .min(8, "Admin API key must be at least 8 characters")
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const config = await getHubConfig();
    return NextResponse.json({
      success: true,
      settings: config,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = settingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { hubUrl, adminApiKey } = validation.data;
    if (!hubUrl && !adminApiKey) {
      return NextResponse.json(
        { success: false, error: "No settings provided to update" },
        { status: 400 }
      );
    }

    const updated = await saveHubConfig({ hubUrl, adminApiKey });

    return NextResponse.json({
      success: true,
      message: "Settings saved to database successfully! Database triggers and runtime updated.",
      settings: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

