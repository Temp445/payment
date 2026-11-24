import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth";
import { getHubConfig, saveHubConfig } from "@/lib/config";
import { verifySmtpConnection, sendTestEmail } from "@/lib/email";
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
  cashfreeTestAppId: z.string().trim().optional(),
  cashfreeTestSecretKey: z.string().trim().optional(),
  cashfreeProdAppId: z.string().trim().optional(),
  cashfreeProdSecretKey: z.string().trim().optional(),
  cashfreeApiVersion: z.string().trim().optional(),

  // Email / Outbound SMTP Settings
  smtpHost: z.string().trim().optional(),
  smtpPort: z.number().optional(),
  smtpUsername: z.string().trim().optional(),
  smtpPassword: z.string().trim().optional(),
  smtpUseTls: z.boolean().optional(),
  defaultFromEmail: z.string().trim().optional(),
  defaultFromName: z.string().trim().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader, req)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const config = await getHubConfig();

    // Check if test SMTP connection requested: /api/v1/settings?test_smtp=true
    const url = new URL(req.url);
    if (url.searchParams.get("test_smtp") === "true") {
      const res = await verifySmtpConnection();
      return NextResponse.json({
        success: res.success,
        connectionStatus: res.success ? "CONNECTED" : "FAILED",
        message: res.message,
        error: res.success ? undefined : res.message,
      });
    }

    // Check if test connection requested: /api/v1/settings?test_connection=true
    if (url.searchParams.get("test_connection") === "true") {
      try {
        const { getCachedCashfreeConfig } = await import("@/lib/config");
        const cfConfig = getCachedCashfreeConfig();

        // Allow explicitly testing TEST or PRODUCTION via query param: ?test_connection=true&mode=TEST
        const requestedMode = (url.searchParams.get("mode") || cfConfig.env).toUpperCase();
        const isProdCheck = requestedMode === "PRODUCTION";

        const appIdToCheck = isProdCheck
          ? (cfConfig.prodAppId || cfConfig.appId)
          : (cfConfig.testAppId || cfConfig.appId);

        const secretKeyToCheck = isProdCheck
          ? (cfConfig.prodSecretKey || cfConfig.secretKey)
          : (cfConfig.testSecretKey || cfConfig.secretKey);

        const baseUrlToCheck = isProdCheck
          ? "https://api.cashfree.com/pg"
          : "https://sandbox.cashfree.com/pg";

        if (!appIdToCheck || !secretKeyToCheck) {
          return NextResponse.json({
            success: false,
            connectionStatus: "FAILED",
            error: `App ID and Secret Key for ${requestedMode} environment cannot be empty.`,
          });
        }

        const res = await fetch(`${baseUrlToCheck}/orders/probe_connection_check`, {
          headers: {
            "x-client-id": appIdToCheck,
            "x-client-secret": secretKeyToCheck,
            "x-api-version": cfConfig.apiVersion,
          },
        });
        const data = await res.json();

        if (data.type === "authentication_error") {
          return NextResponse.json({
            success: false,
            connectionStatus: "FAILED",
            error: data.message || `Cashfree ${requestedMode} authentication failed. Please verify your ${requestedMode} App ID and Secret Key.`,
          });
        }

        return NextResponse.json({
          success: true,
          connectionStatus: "CONNECTED",
          testedEnv: requestedMode,
          message: `Cashfree ${requestedMode} gateway connection verified successfully! Credentials are active and valid.`,
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
    if (!verifyAdminAuth(authHeader, req)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Handle test email dispatch: /api/v1/settings?test_send=true
    const url = new URL(req.url);
    if (url.searchParams.get("test_send") === "true") {
      const targetEmail = body.testEmail || body.email;
      if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
        return NextResponse.json(
          { success: false, error: "A valid test recipient email address is required" },
          { status: 400 }
        );
      }
      const testRes = await sendTestEmail(targetEmail);
      if (!testRes.success) {
        return NextResponse.json(
          { success: false, error: testRes.error || "Failed to dispatch test email" },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Test email successfully dispatched to ${targetEmail}! Please check your inbox.`,
        messageId: testRes.messageId,
      });
    }

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
      cashfreeTestAppId,
      cashfreeTestSecretKey,
      cashfreeProdAppId,
      cashfreeProdSecretKey,
      cashfreeApiVersion,
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword,
      smtpUseTls,
      defaultFromEmail,
      defaultFromName,
    } = validation.data;

    const hasAnyField =
      hubUrl ||
      adminApiKey ||
      cashfreeEnv ||
      cashfreeAppId !== undefined ||
      cashfreeSecretKey !== undefined ||
      cashfreeTestAppId !== undefined ||
      cashfreeTestSecretKey !== undefined ||
      cashfreeProdAppId !== undefined ||
      cashfreeProdSecretKey !== undefined ||
      cashfreeApiVersion ||
      smtpHost !== undefined ||
      smtpPort !== undefined ||
      smtpUsername !== undefined ||
      smtpPassword !== undefined ||
      smtpUseTls !== undefined ||
      defaultFromEmail !== undefined ||
      defaultFromName !== undefined;

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
      cashfreeTestAppId,
      cashfreeTestSecretKey,
      cashfreeProdAppId,
      cashfreeProdSecretKey,
      cashfreeApiVersion,
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword,
      smtpUseTls,
      defaultFromEmail,
      defaultFromName,
    });

    return NextResponse.json({
      success: true,
      message: "Settings saved to database successfully! Configuration updated live.",
      settings: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

