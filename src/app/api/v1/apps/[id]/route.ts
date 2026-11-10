import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, hashSecret, clearAppAuthCache } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";

const updateAppSchema = z.object({
  appName: z.string().min(2).max(100).optional(),
  webhookUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  regenerateSecret: z.boolean().optional(),
  regenerateWebhookSecret: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const app = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            orders: true,
            outboxDeliveries: true,
          },
        },
      },
    });

    if (!app) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, app });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const app = await prisma.application.findUnique({
      where: { id: params.id },
    });

    if (!app) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    const body = await req.json();
    const validation = updateAppSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      appName,
      webhookUrl,
      isActive,
      regenerateSecret,
      regenerateWebhookSecret,
    } = validation.data;

    const dataToUpdate: any = {};
    let newRawClientSecret: string | null = null;
    let newWebhookSecret: string | null = null;

    if (appName !== undefined) {
      dataToUpdate.appName = appName;
    }

    if (webhookUrl !== undefined) {
      dataToUpdate.webhookUrl = webhookUrl;
    }

    if (isActive !== undefined) {
      dataToUpdate.isActive = isActive;
    }

    if (regenerateSecret) {
      newRawClientSecret = `sec_live_${crypto.randomBytes(18).toString("hex")}`;
      dataToUpdate.clientSecretHash = hashSecret(newRawClientSecret);
    }

    if (regenerateWebhookSecret) {
      newWebhookSecret = `whsec_${crypto.randomBytes(16).toString("hex")}`;
      dataToUpdate.webhookSecret = newWebhookSecret;
    }

    const updatedApp = await prisma.application.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    // Clear memory cache so changes take effect immediately
    clearAppAuthCache();

    // Audit log
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    await prisma.auditLog.create({
      data: {
        applicationId: updatedApp.id,
        action: "APPLICATION_UPDATED",
        entityType: "Application",
        entityId: updatedApp.id,
        ipAddress: ip,
        requestDetails: {
          updatedFields: Object.keys(dataToUpdate),
          regeneratedSecret: !!regenerateSecret,
          regeneratedWebhookSecret: !!regenerateWebhookSecret,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Application updated successfully",
      app: {
        id: updatedApp.id,
        appCode: updatedApp.appCode,
        appName: updatedApp.appName,
        clientId: updatedApp.clientId,
        webhookUrl: updatedApp.webhookUrl,
        webhookSecret: updatedApp.webhookSecret,
        isActive: updatedApp.isActive,
        clientSecret: newRawClientSecret, // Returned only if regenerated
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const app = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            orders: true,
            outboxDeliveries: true,
          },
        },
      },
    });

    if (!app) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const orderCount = app._count.orders;

    if (orderCount > 0 && !force) {
      return NextResponse.json(
        {
          success: false,
          error: `Application has ${orderCount} associated order(s). Pass force=true to delete all orders and payments, or deactivate the application instead.`,
          hasOrders: true,
          orderCount,
        },
        { status: 400 }
      );
    }

    // Perform deletion
    if (orderCount > 0 && force) {
      await prisma.$transaction([
        prisma.payment.deleteMany({ where: { order: { applicationId: params.id } } }),
        prisma.refund.deleteMany({ where: { order: { applicationId: params.id } } }),
        prisma.webhookOutboxQueue.deleteMany({ where: { applicationId: params.id } }),
        prisma.order.deleteMany({ where: { applicationId: params.id } }),
        prisma.application.delete({ where: { id: params.id } }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.webhookOutboxQueue.deleteMany({ where: { applicationId: params.id } }),
        prisma.application.delete({ where: { id: params.id } }),
      ]);
    }

    // Clear auth cache
    clearAppAuthCache();

    // Audit log
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    await prisma.auditLog.create({
      data: {
        action: "APPLICATION_DELETED",
        entityType: "Application",
        entityId: params.id,
        ipAddress: ip,
        requestDetails: {
          appCode: app.appCode,
          appName: app.appName,
          clientId: app.clientId,
          ordersDeleted: orderCount,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Application ${app.appName} (${app.appCode}) deleted successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

