import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, hashSecret } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";

const createAppSchema = z.object({
  appCode: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_]+$/, "App Code must be uppercase alphanumeric and underscores")
    .transform((val) => val.toUpperCase()),
  appName: z.string().trim().min(2).max(100),
  webhookUrl: z
    .string()
    .trim()
    .url("Webhook URL must be a valid URL")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const apps = await prisma.application.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            orders: true,
            outboxDeliveries: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, count: apps.length, apps });
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
    const validation = createAppSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { appCode, appName, webhookUrl } = validation.data;

    // Generate credentials
    const clientId = `pub_live_${appCode.toLowerCase()}_${crypto.randomBytes(4).toString("hex")}`;
    const rawClientSecret = `sec_live_${crypto.randomBytes(18).toString("hex")}`;
    const clientSecretHash = hashSecret(rawClientSecret);
    const webhookSecret = `whsec_${crypto.randomBytes(16).toString("hex")}`;

    const app = await prisma.application.create({
      data: {
        appCode,
        appName,
        clientId,
        clientSecretHash,
        webhookUrl: webhookUrl || null,
        webhookSecret,
        isActive: true,
      },
    });

    // Record in Audit Log
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    await prisma.auditLog.create({
      data: {
        applicationId: app.id,
        action: "APPLICATION_REGISTERED",
        entityType: "Application",
        entityId: app.id,
        ipAddress: ip,
        requestDetails: { appCode, appName, clientId, webhookUrl: webhookUrl || null },
      },
    });

    // Return the rawClientSecret ONCE to the admin
    return NextResponse.json(
      {
        success: true,
        message: "Application registered successfully. Store clientSecret securely!",
        app: {
          id: app.id,
          appCode: app.appCode,
          appName: app.appName,
          clientId: app.clientId,
          clientSecret: rawClientSecret, // One-time display
          webhookUrl: app.webhookUrl,
          webhookSecret: app.webhookSecret,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Application with this App Code or Client ID already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
