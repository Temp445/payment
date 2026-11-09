# Real Estate CRM: Payment Hub Integration Guide

This guide details how this Real Estate CRM connects to the **Central Payment Hub** for property bookings, token advances, and income ledger updates.

---

## 1. Setup in CRM

### A. Environment Variables (`.env.local` & Netlify)
```env
PAYMENT_HUB_URL="https://paymenthub.yourdomain.com/api/v1" # or http://localhost:3000/api/v1
PAYMENT_HUB_CLIENT_ID="pub_live_real_estate_crm_xxxx"
PAYMENT_HUB_CLIENT_SECRET="sec_live_xxxx"
PAYMENT_HUB_WEBHOOK_SECRET="whsec_xxxx"
```

### B. Payment Helper (`lib/paymentHub.ts`)
```typescript
export async function createBookingPayment(params: {
  bookingId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  propertyTitle: string;
}) {
  const hubUrl = process.env.PAYMENT_HUB_URL || "http://localhost:3000/api/v1";

  const response = await fetch(`${hubUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": process.env.PAYMENT_HUB_CLIENT_ID!,
      "x-client-secret": process.env.PAYMENT_HUB_CLIENT_SECRET!,
    },
    body: JSON.stringify({
      order_id: params.bookingId,
      order_amount: params.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: `CUST_${params.customerPhone}`,
        customer_phone: params.customerPhone,
        customer_email: params.customerEmail || "buyer@example.com",
        customer_name: params.customerName,
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings?status=paid&booking_id=${params.bookingId}`,
      },
      order_note: `Token advance for ${params.propertyTitle}`,
      metadata: {
        booking_id: params.bookingId,
        property_title: params.propertyTitle,
      },
    }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to create payment session");
  }

  return data; // { payment_session_id, cf_order_id, order_id }
}
```

---

## 2. Webhook Listener (`app/api/webhooks/payment-hub/route.ts`)

When a homebuyer completes payment via UPI / Card, the Payment Hub verifies the Cashfree signature and forwards the verified event here:

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature");

    // 1. Verify Payment Hub signature
    const expected = crypto
      .createHmac("sha256", process.env.PAYMENT_HUB_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest("hex");

    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { event_type, order_id, amount, payment_id, payment_method } = JSON.parse(rawBody).payload;

    if (event_type === "PAYMENT.SUCCESS") {
      // Update Booking
      await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          payment_status: "paid",
          paid_amount: amount,
          payment_ref: payment_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order_id);

      // Record in Income table
      await supabase.from("income").insert({
        booking_id: order_id,
        amount: amount,
        payment_method: payment_method || "Online PG",
        reference_id: payment_id,
        category: "Token Advance",
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 3. Frontend Modal Checkout Component

```tsx
import { load } from "@cashfreepayments/cashfree-js";

export async function launchPaymentModal(paymentSessionId: string) {
  const cashfree = await load({
    mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
  });

  cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_modal",
  });
}
```

