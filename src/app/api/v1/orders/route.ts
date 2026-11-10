import { NextRequest, NextResponse } from "next/server";
import { authenticateApplication } from "@/lib/auth";
import { OrderService } from "@/services/order.service";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-client-id, x-client-secret, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

const createOrderSchema = z.object({
  order_id: z.string().min(1).max(50),
  order_amount: z.number().positive(),
  order_currency: z.string().default("INR"),
  customer_details: z.object({
    customer_id: z.string().min(1),
    customer_phone: z.string().min(10).max(15),
    customer_email: z.string().email().optional(),
    customer_name: z.string().optional(),
  }),
  order_meta: z
    .object({
      return_url: z.string().url().optional(),
      notify_url: z.string().url().optional(),
    })
    .optional(),
  order_note: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const clientId = req.headers.get("x-client-id");
    const clientSecret = req.headers.get("x-client-secret");

    // Authenticates both server apps (with secret) and pure React browser apps (with client-id)
    const app = await authenticateApplication(clientId, clientSecret);
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or inactive client ID" },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");
    const reqOrigin = host ? `${proto}://${host}` : undefined;

    const result = await OrderService.createOrder(app, validation.data, reqOrigin);
    return NextResponse.json(result, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const clientId = req.headers.get("x-client-id");
    const clientSecret = req.headers.get("x-client-secret");

    const app = await authenticateApplication(clientId, clientSecret);
    if (!app || app.isPublicClient) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Listing orders requires secret key" },
        { status: 401, headers: corsHeaders }
      );
    }

    const orders = await prisma.order.findMany({
      where: { applicationId: app.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        payments: {
          select: {
            cfPaymentId: true,
            paymentStatus: true,
            paymentAmount: true,
            paymentMethod: true,
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, count: orders.length, orders },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
