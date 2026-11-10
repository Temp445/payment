import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth";
import { getHubConfig, saveHubConfig } from "@/lib/config";
import { CashfreeAdapter } from "@/lib/cashfree";
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
  cashfreeEnv: z
    .enum(["TEST", "PRODUCTION"], {
      errorMap: () => ({ message: "Cashfree environment must be TEST or PRODUCTION" }),
    })
    .optional(),
  cashfreeAppId: z.string().trim().optional(),
  cashfreeSecretKey: z.string().trim().optional(),
  cashfreeApiVersion: z.string().trim().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const config = await getHubConfig();

    // Check if test connection requested: /api/v1/settings?test_connection=true
    const url = new URL(req.url);
    if (url.searchParams.get("test_connection") === "true") {
      try {
        const { getCachedCashfreeConfig } = await import("@/lib/config");
        const { appId, secretKey, apiVersion, baseUrl } = getCachedCashfreeConfig();

        if (!appId || !secretKey) {
          return NextResponse.json({
            success: false,
            connectionStatus: "FAILED",
            error: "App ID and Secret Key cannot be empty.",
          });
        }

        const res = await fetch(`${baseUrl}/orders/probe_connection_check`, {
          headers: {
            "x-client-id": appId,
            "x-client-secret": secretKey,
            "x-api-version": apiVersion,
          },
        });
        const data = await res.json();

        if (data.type === "authentication_error") {
          return NextResponse.json({
            success: false,
            connectionStatus: "FAILED",
            error: data.message || "Cashfree authentication failed. Please verify your App ID and Secret Key.",
          });
        }

        return NextResponse.json({
          success: true,
          connectionStatus: "CONNECTED",
          message: "Cashfree gateway connection verified successfully! Credentials are active and valid.",
        });
      } catch (connErr: any) {
        return NextResponse.json({
          success: false,
          connectionStatus: "FAILED",
          error: connErr.message || "Failed to connect to Cashfree with current credentials.",
        });
      }
    }

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

    const {
      hubUrl,
      adminApiKey,
      cashfreeEnv,
      cashfreeAppId,
      cashfreeSecretKey,
      cashfreeApiVersion,
    } = validation.data;

    const hasAnyField =
      hubUrl ||
      adminApiKey ||
      cashfreeEnv ||
      cashfreeAppId !== undefined ||
      cashfreeSecretKey !== undefined ||
      cashfreeApiVersion;

    if (!hasAnyField) {
      return NextResponse.json(
        { success: false, error: "No settings provided to update" },
        { status: 400 }
      );
    }

    const updated = await saveHubConfig({
      hubUrl,
      adminApiKey,
      cashfreeEnv,
      cashfreeAppId,
      cashfreeSecretKey,
      cashfreeApiVersion,
    });

    return NextResponse.json({
      success: true,
      message: "Settings saved to database successfully! Cashfree credentials and Hub URLs updated live.",
      settings: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

