# Next.js Centralized Payment Hub
*(Cashfree Payment Gateway + Prisma ORM + Supabase PostgreSQL)*

A multi-tenant payment aggregation and orchestration platform built with **Next.js (App Router)**, **Prisma ORM**, and **Supabase (PostgreSQL)**, integrated with **Cashfree Payment Gateway (API v2023-08-01)**. Designed without Redis dependencies by leveraging a PostgreSQL-native Transactional Outbox pattern.

---

## Architecture Overview

```
                      20 Applications
          [Android Apps]  [Web Applications]  [iOS Apps]
                 |               |               |
                 +---------------+---------------+
                                 |
                                 v
               Next.js Centralized Payment Hub
   +-------------------------------------------------------+
   |  * API Routes / Handlers (/api/v1/...)               |
   |  * Multi-Tenant Auth (Fast SHA-256 + LRU Cache)       |
   |  * Payment Orchestrator (Namespaced Order IDs)        |
   |  * Terminal State Machine (Locks PAID status)         |
   |  * Webhook Processor (Signature + Cashfree API Check) |
   |  * Resilient Outbox Worker (4s Timeout / Retries)     |
   |  * Integrated Admin Dashboard & Reports (App Router)  |
   +-------------------------------------------------------+
           |                                  |
           v                                  v
    Cashfree Gateway                    Prisma ORM
   +-------------------+               +-------------------+
   | * Orders API      |               | Multi-Tenant      |
   | * Checkout SDK    |               | PostgreSQL Schema |
   | * Signed Webhooks |               +-------------------+
   | * Settlements API |                      |
   +-------------------+                      v
                                      Supabase PostgreSQL
                                     (Supavisor Pooler 6543)
```

---

## Key Features

1. **Multi-Tenant Order Namespacing**: Prevents collisions across 20 distinct client databases by formatting Cashfree order IDs as `${appCode}_${clientOrderId}` (< 50 chars).
2. **Terminal Payment State Machine**: Locks `PAID` orders against late or out-of-order `FAILED` webhooks.
3. **Double-Check Webhook Security**: Verifies Cashfree HMAC-SHA256 signature **and** directly re-verifies payment status via Cashfree's Payments API.
4. **Redis-Free Outbox Pattern**: PostgreSQL `webhook_outbox_queue` delivers signed webhooks (`x-hub-signature`) to consumer apps with exponential backoff and a 4-second timeout per client.
5. **Mobile SDK Polling**: Dedicated lightweight `GET /api/v1/orders/:id/status` endpoint for Android and iOS apps returning from external UPI apps (Google Pay, PhonePe).
6. **Cashfree Settlement Reconciliation**: Tracks batch payout settlements from Cashfree against ledger records.
7. **Full Admin Dashboard**: Built directly in Next.js with Real-time GMV, Volume Charts (Recharts), 20-App Tenant Management, Live Orders Explorer, and Refund Center.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Supabase Supavisor Transaction Pooler connection string (`port 6543`) with `?pgbouncer=true` |
| `DIRECT_URL` | Direct Supabase connection string (`port 5432`) for Prisma migrations |
| `CASHFREE_APP_ID` | Cashfree Merchant App ID |
| `CASHFREE_SECRET_KEY` | Cashfree Secret Key |
| `CASHFREE_ENV` | `TEST` (Sandbox) or `PRODUCTION` |
| `ADMIN_API_KEY` | Secret master key for the Admin Dashboard and admin routes |
| `NEXT_PUBLIC_APP_URL` | Base public URL of this Payment Hub (e.g. `http://localhost:3000` or ngrok URL) |

### 3. Database Migration
Apply the Prisma schema to your Supabase PostgreSQL database:
```bash
# Push schema directly
npx prisma db push

# Generate Prisma Client
npx prisma generate
```
*(Alternatively, copy and run `prisma/migrations/init.sql` directly inside the **Supabase SQL Editor**)*.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the **Admin Dashboard**.

---

## API Reference (Client Applications)

All client requests must include:
- `x-client-id: <CLIENT_ID>`
- `x-client-secret: <CLIENT_SECRET>`

### 1. Create Payment Order
`POST /api/v1/orders`

**Request Body:**
```json
{
  "order_id": "APP001_ORD_99182",
  "order_amount": 5000.00,
  "order_currency": "INR",
  "customer_details": {
    "customer_id": "CUST_501",
    "customer_phone": "9876543210",
    "customer_email": "user@example.com",
    "customer_name": "Arun Kumar"
  },
  "order_meta": {
    "return_url": "https://website01.com/checkout/callback?order_id={order_id}"
  },
  "order_note": "Subscription plan"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "order_id": "APP001_ORD_99182",
  "cf_order_id": "APP001_APP001ORD99182",
  "payment_session_id": "session_xxxx...",
  "order_status": "ACTIVE",
  "order_amount": 5000
}
```

---

### 2. Fast Mobile SDK Status Polling
`GET /api/v1/orders/{order_id}/status`

**Response:**
```json
{
  "success": true,
  "order_id": "APP001_ORD_99182",
  "cf_order_id": "APP001_APP001ORD99182",
  "status": "PAID",
  "amount": 5000,
  "latest_payment": {
    "cfPaymentId": "3881920",
    "paymentStatus": "SUCCESS",
    "paymentMethod": "upi",
    "bankReference": "48819201928"
  }
}
```

---

### 3. Initiate Refund
`POST /api/v1/refunds`

**Request Body:**
```json
{
  "order_id": "APP001_ORD_99182",
  "refund_amount": 1500.00,
  "note": "Customer requested partial refund"
}
```

---

### 4. Outbox Worker Trigger (Cron)
`GET /api/v1/cron/outbox-worker`
*(Protected via `ADMIN_API_KEY` header or query `?key=...`)*
Triggers delivery of pending outgoing webhooks to consumer applications.

---

## Admin Dashboard Pages

- **`/`**: Executive Overview — Real-time GMV, success rates, volume charts, and recent transaction feeds.
- **`/apps`**: Applications Registry — Register new tenant applications, generate/rotate API keys, and set webhook destination URLs.
- **`/orders`**: Orders Explorer — Live ledger of all transactions with status badges and Cashfree IDs.
- **`/refunds`**: Refund Management — Process full or partial refunds directly through Cashfree.
- **`/reconciliation`**: Settlements — Reconcile batch payouts against customer transactions.
- **`/outbox`**: Webhook Outbox — Live status of outgoing client notifications, retry counters, and manual retry actions.
- **`/audit-logs`**: Audit Logs — Immutable log of security actions and credential creation.

