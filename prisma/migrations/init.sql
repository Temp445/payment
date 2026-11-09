-- ====================================================================
-- Central Payment Hub - Supabase PostgreSQL Schema
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'ACTIVE', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING', 'USER_DROPPED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Applications Registry
CREATE TABLE IF NOT EXISTS "applications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "appCode" VARCHAR(50) UNIQUE NOT NULL,
    "appName" VARCHAR(100) NOT NULL,
    "clientId" VARCHAR(64) UNIQUE NOT NULL,
    "clientSecretHash" VARCHAR(255) NOT NULL,
    "webhookUrl" TEXT,
    "webhookSecret" VARCHAR(64) NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS "orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "applicationId" UUID NOT NULL REFERENCES "applications"("id") ON DELETE RESTRICT,
    "appOrderId" VARCHAR(100) NOT NULL,
    "cfOrderId" VARCHAR(100) UNIQUE NOT NULL,
    "paymentSessionId" TEXT,
    "orderAmount" NUMERIC(12, 2) NOT NULL,
    "orderCurrency" VARCHAR(3) DEFAULT 'INR',
    "orderStatus" "OrderStatus" DEFAULT 'CREATED',
    "customerId" VARCHAR(100) NOT NULL,
    "customerName" VARCHAR(100),
    "customerEmail" VARCHAR(150),
    "customerPhone" VARCHAR(20) NOT NULL,
    "orderNote" TEXT,
    "returnUrl" TEXT,
    "notifyUrl" TEXT,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "uq_app_order" UNIQUE("applicationId", "appOrderId")
);

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS "payments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "cfPaymentId" VARCHAR(100) UNIQUE NOT NULL,
    "paymentAmount" NUMERIC(12, 2) NOT NULL,
    "paymentCurrency" VARCHAR(3) DEFAULT 'INR',
    "paymentStatus" "PaymentStatus" NOT NULL,
    "paymentMethod" VARCHAR(50),
    "paymentGroup" VARCHAR(50),
    "paymentTime" TIMESTAMPTZ,
    "bankReference" VARCHAR(100),
    "authId" VARCHAR(100),
    "errorCode" VARCHAR(100),
    "errorDescription" TEXT,
    "rawWebhookPayload" JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Refunds Table
CREATE TABLE IF NOT EXISTS "refunds" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
    "cfRefundId" VARCHAR(100) UNIQUE,
    "refundAmount" NUMERIC(12, 2) NOT NULL,
    "refundCurrency" VARCHAR(3) DEFAULT 'INR',
    "refundNote" TEXT,
    "refundStatus" "RefundStatus" DEFAULT 'PENDING',
    "refundType" VARCHAR(20) DEFAULT 'STANDARD',
    "rawResponse" JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Settlements Table
CREATE TABLE IF NOT EXISTS "settlements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cfSettlementId" VARCHAR(100) UNIQUE NOT NULL,
    "settlementAmount" NUMERIC(12, 2) NOT NULL,
    "settlementCurrency" VARCHAR(3) DEFAULT 'INR',
    "utrNumber" VARCHAR(100),
    "settlementDate" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Webhook Outbox Queue
CREATE TABLE IF NOT EXISTS "webhook_outbox_queue" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "applicationId" UUID NOT NULL REFERENCES "applications"("id") ON DELETE CASCADE,
    "orderId" UUID REFERENCES "orders"("id") ON DELETE CASCADE,
    "eventType" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookStatus" DEFAULT 'PENDING',
    "attempts" INT DEFAULT 0,
    "maxAttempts" INT DEFAULT 5,
    "nextRetryAt" TIMESTAMPTZ DEFAULT NOW(),
    "responseStatus" INT,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Audit Logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "applicationId" UUID REFERENCES "applications"("id") ON DELETE SET NULL,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50),
    "entityId" VARCHAR(100),
    "ipAddress" VARCHAR(45),
    "requestDetails" JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for High Throughput
CREATE INDEX IF NOT EXISTS "idx_orders_app_id" ON "orders"("applicationId");
CREATE INDEX IF NOT EXISTS "idx_orders_cf_order_id" ON "orders"("cfOrderId");
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders"("orderStatus");
CREATE INDEX IF NOT EXISTS "idx_payments_order_id" ON "payments"("orderId");
CREATE INDEX IF NOT EXISTS "idx_outbox_poll" ON "webhook_outbox_queue"("status", "nextRetryAt") WHERE "status" IN ('PENDING', 'PROCESSING');

