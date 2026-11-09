# Universal Client Integration Guide: Pure React (No Supabase, No Backend) & Any Tech Stack

> **Key Rule**: The Central Payment Hub uses Supabase **only internally** for its own ledger. **Client applications are NEVER required to use Supabase, Netlify, or any specific database or cloud provider.**
>
> The Payment Hub is a **100% universal, tech-stack-agnostic REST platform** supporting:
> 1. **Pure React / Frontend SPAs** (Vite, CRA, Next.js, Vue, Angular, Mobile Apps) with **NO backend server and NO Supabase**.
> 2. **Full-Stack Applications** using **ANY language / database** (Node.js, Express, Python/Django/FastAPI, PHP/Laravel, Go, Java, MongoDB, MySQL, PostgreSQL, etc.).

---

## Pattern 1: Pure React Frontend (Zero-Backend, No Supabase)

If your application is a **pure React frontend** (e.g., built with Vite, Create React App, or hosted on S3/Vercel/GitHub Pages):

### How it works:
1. You register your React app in the Payment Hub and get a **Public Client ID** (`pub_live_react_app_xxxx`).
2. Your React app calls the Payment Hub's `POST /api/v1/orders` **directly from the browser using only `x-client-id`** (The Payment Hub has built-in CORS enabled).
3. The Payment Hub returns the Cashfree `payment_session_id`.
4. Your React app launches Cashfree's drop-in modal checkout (`@cashfreepayments/cashfree-js`).
5. Once the modal closes, your React app polls the lightweight `GET /api/v1/orders/{orderId}/status` endpoint using `x-client-id` to display the success confirmation.

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer / User
    participant React as Pure React App (Browser)
    participant Hub as Central Payment Hub
    participant CF as Cashfree PG

    User->>React: Clicks "Pay ₹5,000"
    Note over React: Direct browser call (CORS enabled)<br/>Uses only Public Client ID!
    React->>Hub: POST /api/v1/orders (Header: x-client-id)
    Hub->>CF: Create Cashfree Order
    CF-->>Hub: Return payment_session_id
    Hub-->>React: Return payment_session_id & cf_order_id

    Note over React: Cashfree JS mounts modal
    React->>User: Opens Cashfree Checkout (UPI / Card / NetBanking)
    User->>CF: Completes payment
    CF-->>React: Modal callback: Payment finished

    loop Poll Status (Every 1.5s, max 4 times)
        React->>Hub: GET /api/v1/orders/{orderId}/status (Header: x-client-id)
        Hub-->>React: { status: "PAID", payment: { ... } }
    end

    React->>User: Show "Payment Confirmed!" receipt screen
```

---

### Pure React Implementation (Copy-Paste Ready)

#### Step 1: Install Cashfree SDK in your React Project
```bash
npm install @cashfreepayments/cashfree-js
```

#### Step 2: Add your Public Client ID to your React `.env`
In your React app `.env` (or `.env.local`):
```env
# Pure React Frontend .env (Vite or CRA)
VITE_PAYMENT_HUB_URL="http://localhost:3000/api/v1" # or your deployed Payment Hub URL
VITE_PAYMENT_HUB_CLIENT_ID="pub_live_my_react_app_xxxx"
```

#### Step 3: Create the React Payment Hook (`src/usePaymentHub.ts`)

```typescript
// src/usePaymentHub.ts
import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

interface InitiatePaymentParams {
  orderId: string;
  amount: number;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (error: string) => void;
}

export function usePaymentHub() {
  const [loading, setLoading] = useState(false);

  const pay = async ({
    orderId,
    amount,
    customerPhone,
    customerName,
    customerEmail,
    onSuccess,
    onFailure,
  }: InitiatePaymentParams) => {
    setLoading(true);
    const hubUrl = import.meta.env.VITE_PAYMENT_HUB_URL || "http://localhost:3000/api/v1";
    const clientId = import.meta.env.VITE_PAYMENT_HUB_CLIENT_ID;

    try {
      // 1. Direct browser call to Central Payment Hub (CORS enabled)
      const response = await fetch(`${hubUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": clientId,
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: amount,
          order_currency: "INR",
          customer_details: {
            customer_id: `CUST_${customerPhone}`,
            customer_phone: customerPhone,
            customer_name: customerName || "Customer",
            customer_email: customerEmail || "customer@example.com",
          },
          order_note: "React Web Store Order",
        }),
      });

      const orderData = await response.json();
      if (!orderData.payment_session_id) {
        throw new Error(orderData.error || "Failed to initiate payment session");
      }

      // 2. Load Cashfree Checkout Modal
      const cashfree = await load({
        mode: import.meta.env.PROD ? "production" : "sandbox",
      });

      // 3. Mount Drop-in Modal (User never leaves your React app)
      const checkoutResult = await cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_modal",
      });

      if (checkoutResult.error) {
        onFailure(checkoutResult.error.message || "Payment cancelled by user");
        return;
      }

      // 4. Poll status to confirm payment
      pollPaymentStatus(orderId, hubUrl, clientId, onSuccess, onFailure);
    } catch (err: any) {
      onFailure(err.message || "Network error launching payment");
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = (
    orderId: string,
    hubUrl: string,
    clientId: string,
    onSuccess: (id: string) => void,
    onFailure: (err: string) => void
  ) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${hubUrl}/orders/${orderId}/status`, {
          headers: { "x-client-id": clientId },
        });
        const data = await res.json();

        if (data.status === "PAID") {
          clearInterval(interval);
          onSuccess(data.latest_payment?.cfPaymentId || "CONFIRMED");
        } else if (attempts >= 6) {
          clearInterval(interval);
          onSuccess("PENDING_VERIFICATION");
        }
      } catch (e) {
        clearInterval(interval);
        onFailure("Failed to check status");
      }
    }, 1500);
  };

  return { pay, loading };
}
```

#### Step 4: Use in your React Component (`src/CheckoutPage.tsx`)

```tsx
// src/CheckoutPage.tsx
import React, { useState } from "react";
import { usePaymentHub } from "./usePaymentHub";

export function CheckoutPage() {
  const { pay, loading } = usePaymentHub();
  const [result, setResult] = useState<string | null>(null);

  const handleCheckout = () => {
    setResult(null);
    pay({
      orderId: `ORD_${Date.now()}`,
      amount: 4999.00,
      customerPhone: "9876543210",
      customerName: "Priya Sharma",
      customerEmail: "priya@example.com",
      onSuccess: (paymentId) => {
        setResult(`🎉 Payment Successful! Reference ID: ${paymentId}`);
      },
      onFailure: (errorMsg) => {
        setResult(`❌ ${errorMsg}`);
      },
    });
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>Checkout: Annual Subscription</h2>
      <p>Amount: <strong>₹4,999.00</strong></p>

      <button
        onClick={handleCheckout}
        disabled={loading}
        style={{
          padding: "12px 24px",
          backgroundColor: "#16a34a",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {loading ? "Opening Cashfree..." : "Pay ₹4,999 with Cashfree"}
      </button>

      {result && <p style={{ marginTop: "1rem" }}>{result}</p>}
    </div>
  );
}
```

---

## Pattern 2: Application with ANY Custom Backend (Python, PHP, Node, Go, Java, etc.)

If your application has its own backend server and its own database (**MongoDB, MySQL, PostgreSQL, Firebase, etc.**):

### 1. Backend Order Initiation
Your backend makes a standard server-to-server HTTP request:
```bash
POST /api/v1/orders
Headers:
  x-client-id: <YOUR_CLIENT_ID>
  x-client-secret: <YOUR_CLIENT_SECRET>
Body:
  {
    "order_id": "YOUR_INTERNAL_ID",
    "order_amount": 1000.00,
    "customer_details": {
      "customer_id": "USER_123",
      "customer_phone": "9999999999"
    }
  }
```
Returns:
```json
{
  "payment_session_id": "session_xxxx",
  "cf_order_id": "YOURAPP_YOUR_INTERNAL_ID"
}
```

### 2. Webhook Delivery to your Backend
The Payment Hub verifies Cashfree's signature, validates the status, and posts the verified result to **your backend's webhook endpoint**:
```
POST https://yourapp.com/api/payment-webhook
Headers:
  x-hub-signature: <HMAC-SHA256 signature>
Body:
  {
    "event_type": "PAYMENT.SUCCESS",
    "order_id": "YOUR_INTERNAL_ID",
    "amount": 1000.00,
    "payment_id": "CF_PAY_991823"
  }
```
Your backend verifies `x-hub-signature` using your `webhookSecret` and updates your database (MySQL, MongoDB, Firebase, etc.) — **completely independent of Supabase**.

---

## Summary

| Technology | Needs Supabase? | Needs Backend Server? | How it connects |
| :--- | :---: | :---: | :--- |
| **Pure React SPA** (Vite / CRA) | ❌ **No** | ❌ **No** | Directly from browser via `x-client-id` + Cashfree modal |
| **Node.js / Express** | ❌ **No** | ✅ Yes | Server-to-server HTTP + webhook |
| **Python (Django / FastAPI)** | ❌ **No** | ✅ Yes | Server-to-server HTTP + webhook |
| **PHP / Laravel** | ❌ **No** | ✅ Yes | Server-to-server HTTP + webhook |
| **Android / iOS App** | ❌ **No** | ❌ **No** | Direct via `x-client-id` + Cashfree Mobile SDK |
| **Real Estate CRM** | ✅ (uses its own DB) | ✅ Yes | Via Next.js Route Handlers + Supabase |
