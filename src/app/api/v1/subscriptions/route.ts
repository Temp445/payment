import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPlanSchema = z.object({
  applicationId: z.string().min(1, "Target Application is required"),
  // Product code and product name are derived automatically from application
  productCode: z.string().optional(),
  productName: z.string().optional(),
  tier: z.string().trim().min(2, "Tier name is required").max(50),
  tierLevel: z.number().int().min(1).default(1),
  offerPrice: z.number().min(0, "Price must be non-negative"),
  offerCurrency: z.string().default("INR"),
  offerPeriod: z.number().int().positive().default(1),
  offerPeriodType: z.enum(["day", "month", "year"]).default("month"),
  userLimit: z.number().int().positive().default(5),
  features: z.array(z.string()).default([]),
});

const updatePlanSchema = z.object({
  offerId: z.union([z.string(), z.number()]).optional(),
  tier: z.string().trim().min(1).optional(),
  tierLevel: z.number().int().min(1).optional(),
  offerPrice: z.number().min(0).optional(),
  offerCurrency: z.string().optional(),
  offerPeriod: z.number().int().positive().optional(),
  offerPeriodType: z.enum(["day", "month", "year"]).optional(),
  userLimit: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
  offerIsActive: z.boolean().optional(),

  // For updating subscription / license directly
  subscriptionId: z.union([z.string(), z.number()]).optional(),
  offerEndsOn: z.string().optional(),
  licenseIsActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Run auto-expiry check
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE public.user_subscriptions
        SET offer_is_active = false
        WHERE offer_is_active = true AND offer_ends_on < CURRENT_DATE
      `);
    } catch {
      // Best-effort if tables newly created
    }

    // 2. Fetch all active registered tenant applications
    const apps = await prisma.application.findMany({
      select: { id: true, appCode: true, appName: true },
      where: { isActive: true },
      orderBy: { appName: "asc" },
    });

    // 3. Fetch products and subscription plans via direct SQL (bypasses any Prisma client model mismatch)
    let formattedSubs: any[] = [];
    let products: any[] = [];

    try {
      // Auto-sanitize legacy '_SAAS' suffix in database so product_code matches appCode 1:1
      await prisma.$executeRawUnsafe(`
        UPDATE public.products_offers p
        SET product_code = a."appCode"
        FROM public.applications a
        WHERE a.id = p.application_id AND p.product_code LIKE '%_SAAS'
      `).catch(() => {});

      const [productsRaw, subsRaw]: [any[], any[]] = await Promise.all([
        prisma.$queryRawUnsafe(`
          SELECT 
            p.id,
            p.application_id as "applicationId",
            p.product_code as "productCode",
            p.product_name as "productName",
            p.available_from as "availableFrom",
            p.product_is_active as "productIsActive",
            a."appCode",
            a."appName",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', o.id::text,
                  'productId', o.product_id,
                  'tier', o.tier,
                  'tierLevel', o.tier_level,
                  'offerPrice', o.offer_price,
                  'offerCurrency', o.offer_currency::text,
                  'offerPeriod', o.offer_period,
                  'offerPeriodType', o.offer_period_type,
                  'userLimit', o.user_limit,
                  'tierLimits', o.tier_limits,
                  'offerIsActive', o.offer_is_active
                ) ORDER BY o.tier_level ASC
              ) FILTER (WHERE o.id IS NOT NULL),
              '[]'::json
            ) as "subscriptionOffers"
          FROM public.products_offers p
          JOIN public.applications a ON a.id = p.application_id
          LEFT JOIN public.subscription_offers o ON o.product_id = p.id
          GROUP BY p.id, a."appCode", a."appName"
          ORDER BY p.created_at DESC
        `),
        prisma.$queryRawUnsafe(`
          SELECT 
            s.id::text,
            s.organization_id,
            s.user_id,
            s.offer_starts_on,
            s.offer_ends_on,
            s.offer_is_active,
            s.is_trial_period,
            p.product_code,
            p.product_name,
            a."appCode" as app_code,
            a."appName" as app_name,
            o.tier,
            o.tier_level,
            o.offer_price as price,
            o.offer_currency::text as currency,
            o.user_limit
          FROM public.user_subscriptions s
          JOIN public.products_offers p ON p.id = s.product_id
          JOIN public.applications a ON a.id = p.application_id
          JOIN public.subscription_offers o ON o.id = s.offer_id
          ORDER BY s.created_at DESC
        `),
      ]);

      products = (productsRaw || []).map((p) => ({
        ...p,
        application: { id: p.applicationId, appCode: p.appCode, appName: p.appName },
      }));

      formattedSubs = (subsRaw || []).map((s) => {
        const ends = new Date(s.offer_ends_on);
        ends.setHours(0, 0, 0, 0);
        const diff = Math.ceil((ends.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: s.id.toString(),
          organization_id: s.organization_id,
          user_id: s.user_id,
          app_code: s.app_code,
          app_name: s.app_name,
          product_name: s.product_name,
          product_code: s.product_code,
          tier: s.tier,
          tier_level: s.tier_level,
          price: s.price,
          currency: s.currency,
          user_limit: s.user_limit,
          starts_on: s.offer_starts_on instanceof Date ? s.offer_starts_on.toISOString().split("T")[0] : String(s.offer_starts_on).split("T")[0],
          ends_on: s.offer_ends_on instanceof Date ? s.offer_ends_on.toISOString().split("T")[0] : String(s.offer_ends_on).split("T")[0],
          days_remaining: Math.max(0, diff),
          is_active: s.offer_is_active && diff >= 0,
          is_trial: s.is_trial_period,
        };
      });
    } catch (dbErr: any) {
      console.warn("Subscriptions lookup notice:", dbErr.message);
    }

    const activeCount = formattedSubs.filter((s) => s.is_active).length;
    const expiredCount = formattedSubs.length - activeCount;

    return NextResponse.json({
      success: true,
      stats: {
        total: formattedSubs.length,
        active: activeCount,
        expired: expiredCount,
        productsCount: products.length,
      },
      subscriptions: formattedSubs,
      products,
      apps,
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
    const parsed = createPlanSchema.parse(body);

    // 1. Fetch Target Application to derive productCode and productName
    const app = await prisma.application.findUnique({
      where: { id: parsed.applicationId },
      select: { id: true, appCode: true, appName: true },
    });

    if (!app) {
      return NextResponse.json(
        { success: false, error: "Target Application not found. Please select a valid application." },
        { status: 404 }
      );
    }

    // STRICT ENFORCEMENT: Never create arbitrary custom product code or name.
    // Derive directly from the target application namespace.
    const productCode = app.appCode;
    const productName = app.appName;

    // 2. Find or create master product in public.products_offers via safe direct SQL
    const products: any[] = await prisma.$queryRawUnsafe(
      `INSERT INTO public.products_offers (id, application_id, product_code, product_name, product_is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, true)
       ON CONFLICT (application_id, product_code) 
       DO UPDATE SET product_name = EXCLUDED.product_name, updated_at = now()
       RETURNING id, application_id as "applicationId", product_code as "productCode", product_name as "productName"`,
      app.id,
      productCode,
      productName
    );

    const product = products[0];

    // 3. Create subscription offer tier in public.subscription_offers via safe direct SQL
    const offers: any[] = await prisma.$queryRawUnsafe(
      `INSERT INTO public.subscription_offers (
         product_id, tier, tier_level, offer_price, offer_currency, offer_period, offer_period_type, user_limit, tier_limits, offer_is_active
       ) VALUES (
         $1::uuid, $2, $3, $4, $5::public.pay_currency, $6, $7, $8, $9::jsonb, true
       ) RETURNING id, product_id as "productId", tier, tier_level as "tierLevel", offer_price as "offerPrice", offer_currency as "offerCurrency", offer_period as "offerPeriod", offer_period_type as "offerPeriodType", user_limit as "userLimit", tier_limits as "tierLimits"`,
      product.id,
      parsed.tier,
      parsed.tierLevel,
      parsed.offerPrice,
      parsed.offerCurrency || "INR",
      parsed.offerPeriod,
      parsed.offerPeriodType,
      parsed.userLimit,
      JSON.stringify({ features: parsed.features })
    );

    const offer = offers[0];

    return NextResponse.json({
      success: true,
      product,
      offer: {
        ...offer,
        id: offer.id.toString(),
      },
    });
  } catch (error: any) {
    console.error("POST /api/v1/subscriptions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updatePlanSchema.parse(body);

    // 1. Update Subscription Offer Tier
    if (parsed.offerId) {
      const existingOffers: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, product_id, tier, tier_level, offer_price, offer_currency, offer_period, offer_period_type, user_limit, tier_limits, offer_is_active 
         FROM public.subscription_offers 
         WHERE id = $1`,
        BigInt(parsed.offerId)
      );

      if (!existingOffers || existingOffers.length === 0) {
        return NextResponse.json({ success: false, error: "Plan offer tier not found" }, { status: 404 });
      }

      const curr = existingOffers[0];
      const updatedTier = parsed.tier !== undefined ? parsed.tier : curr.tier;
      const updatedLevel = parsed.tierLevel !== undefined ? parsed.tierLevel : curr.tier_level;
      const updatedPrice = parsed.offerPrice !== undefined ? parsed.offerPrice : curr.offer_price;
      const updatedCurrency = parsed.offerCurrency !== undefined ? parsed.offerCurrency : curr.offer_currency;
      const updatedPeriod = parsed.offerPeriod !== undefined ? parsed.offerPeriod : curr.offer_period;
      const updatedPeriodType = parsed.offerPeriodType !== undefined ? parsed.offerPeriodType : curr.offer_period_type;
      const updatedUserLimit = parsed.userLimit !== undefined ? parsed.userLimit : curr.user_limit;
      const updatedLimits = parsed.features !== undefined ? { features: parsed.features } : curr.tier_limits;
      const updatedActive = parsed.offerIsActive !== undefined ? parsed.offerIsActive : curr.offer_is_active;

      const updatedRows: any[] = await prisma.$queryRawUnsafe(
        `UPDATE public.subscription_offers
         SET 
           tier = $2,
           tier_level = $3,
           offer_price = $4,
           offer_currency = $5::public.pay_currency,
           offer_period = $6,
           offer_period_type = $7,
           user_limit = $8,
           tier_limits = $9::jsonb,
           offer_is_active = $10,
           updated_at = now()
         WHERE id = $1
         RETURNING id, product_id as "productId", tier, tier_level as "tierLevel", offer_price as "offerPrice", offer_currency as "offerCurrency", offer_period as "offerPeriod", offer_period_type as "offerPeriodType", user_limit as "userLimit", tier_limits as "tierLimits", offer_is_active as "offerIsActive"`,
        BigInt(parsed.offerId),
        updatedTier,
        updatedLevel,
        updatedPrice,
        updatedCurrency,
        updatedPeriod,
        updatedPeriodType,
        updatedUserLimit,
        JSON.stringify(updatedLimits),
        updatedActive
      );

      return NextResponse.json({
        success: true,
        offer: {
          ...updatedRows[0],
          id: updatedRows[0].id.toString(),
        },
      });
    }

    // 2. Update User Subscription License
    if (parsed.subscriptionId) {
      const updatedSubs: any[] = await prisma.$queryRawUnsafe(
        `UPDATE public.user_subscriptions
         SET 
           offer_is_active = COALESCE($2, offer_is_active),
           offer_ends_on = COALESCE($3::date, offer_ends_on),
           updated_at = now()
         WHERE id = $1
         RETURNING id, organization_id, offer_is_active, offer_ends_on`,
        BigInt(parsed.subscriptionId),
        parsed.licenseIsActive !== undefined ? parsed.licenseIsActive : null,
        parsed.offerEndsOn || null
      );

      return NextResponse.json({
        success: true,
        subscription: updatedSubs[0],
      });
    }

    return NextResponse.json({ success: false, error: "Missing offerId or subscriptionId" }, { status: 400 });
  } catch (error: any) {
    console.error("PUT /api/v1/subscriptions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const offerId = searchParams.get("offerId");
    const productId = searchParams.get("productId");
    const subscriptionId = searchParams.get("subscriptionId");

    if (offerId) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM public.subscription_offers WHERE id = $1`,
        BigInt(offerId)
      );
      return NextResponse.json({ success: true, message: `Offer tier ${offerId} deleted successfully` });
    }

    if (productId) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM public.products_offers WHERE id = $1::uuid`,
        productId
      );
      return NextResponse.json({ success: true, message: `Product ${productId} and its plans deleted successfully` });
    }

    if (subscriptionId) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM public.user_subscriptions WHERE id = $1`,
        BigInt(subscriptionId)
      );
      return NextResponse.json({ success: true, message: `Subscription license ${subscriptionId} deleted successfully` });
    }

    return NextResponse.json(
      { success: false, error: "Missing offerId, productId, or subscriptionId in request parameters" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("DELETE /api/v1/subscriptions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
