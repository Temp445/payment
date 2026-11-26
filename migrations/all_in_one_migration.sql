-- ==============================================================================
-- ALL_IN_ONE_MIGRATION.SQL: Centralized Payment Hub Master Setup
-- Exact 1:1 schema, types, constraints, functions, triggers & cron
-- Matches Prisma & Supabase PostgreSQL precisely
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PART 1: EXTENSIONS & ENUMS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
    CREATE TYPE public."OrderStatus" AS ENUM (
        'CREATED', 'ACTIVE', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public."PaymentStatus" AS ENUM (
        'SUCCESS', 'FAILED', 'PENDING', 'USER_DROPPED', 'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public."RefundStatus" AS ENUM (
        'PENDING', 'SUCCESS', 'FAILED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public."WebhookStatus" AS ENUM (
        'PENDING', 'PROCESSING', 'DELIVERED', 'FAILED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------------------------
-- PART 2: CORE TABLES & INDEXES
-- ------------------------------------------------------------------------------

-- 1. Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
  id text not null,
  "appCode" text not null,
  "appName" text not null,
  "clientId" text not null,
  "clientSecretHash" text not null,
  "webhookUrl" text null,
  "webhookSecret" text not null,
  "isActive" boolean not null default true,
  "createdAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone not null,
  "displayName" text null,
  "logoUrl" text null,
  "brandColor" text null,
  environment text not null default 'INHERIT'::text,
  constraint applications_pkey primary key (id)
) TABLESPACE pg_default;

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS environment text not null default 'INHERIT'::text;

CREATE UNIQUE INDEX IF NOT EXISTS "applications_appCode_key" on public.applications using btree ("appCode") TABLESPACE pg_default;
CREATE UNIQUE INDEX IF NOT EXISTS "applications_clientId_key" on public.applications using btree ("clientId") TABLESPACE pg_default;

-- 2. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text not null,
  "applicationId" text null,
  action text not null,
  "entityType" text null,
  "entityId" text null,
  "ipAddress" text null,
  "requestDetails" jsonb null,
  "createdAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
  constraint audit_logs_pkey primary key (id),
  constraint "audit_logs_applicationId_fkey" foreign KEY ("applicationId") references applications (id) on update CASCADE on delete set null
) TABLESPACE pg_default;

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id text not null,
  "applicationId" text not null,
  "appOrderId" text not null,
  "cfOrderId" text not null,
  "paymentSessionId" text null,
  "orderAmount" numeric(12, 2) not null,
  "orderCurrency" text not null default 'INR'::text,
  "orderStatus" public."OrderStatus" not null default 'CREATED'::"OrderStatus",
  "customerId" text not null,
  "customerName" text null,
  "customerEmail" text null,
  "customerPhone" text not null,
  "orderNote" text null,
  "returnUrl" text null,
  "notifyUrl" text null,
  metadata jsonb null default '{}'::jsonb,
  "createdAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone not null,
  constraint orders_pkey primary key (id),
  constraint "orders_applicationId_fkey" foreign KEY ("applicationId") references applications (id) on update CASCADE on delete RESTRICT
) TABLESPACE pg_default;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_cfOrderId_key" on public.orders using btree ("cfOrderId") TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS "orders_applicationId_idx" on public.orders using btree ("applicationId") TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS "orders_cfOrderId_idx" on public.orders using btree ("cfOrderId") TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS "orders_orderStatus_idx" on public.orders using btree ("orderStatus") TABLESPACE pg_default;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_applicationId_appOrderId_key" on public.orders using btree ("applicationId", "appOrderId") TABLESPACE pg_default;

-- 4. Payment Hub Config Table
CREATE TABLE IF NOT EXISTS public.payment_hub_config (
  key character varying(50) not null,
  value text not null,
  updated_at timestamp without time zone not null default now(),
  constraint payment_hub_config_pkey primary key (key)
) TABLESPACE pg_default;

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id text not null,
  "orderId" text not null,
  "cfPaymentId" text not null,
  "paymentAmount" numeric(12, 2) not null,
  "paymentCurrency" text not null default 'INR'::text,
  "paymentStatus" public."PaymentStatus" not null,
  "paymentMethod" text null,
  "paymentGroup" text null,
  "paymentTime" timestamp without time zone null,
  "bankReference" text null,
  "authId" text null,
  "errorCode" text null,
  "errorDescription" text null,
  "rawWebhookPayload" jsonb null,
  "createdAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
  constraint payments_pkey primary key (id),
  constraint "payments_orderId_fkey" foreign KEY ("orderId") references orders (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_cfPaymentId_key" on public.payments using btree ("cfPaymentId") TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS "payments_orderId_idx" on public.payments using btree ("orderId") TABLESPACE pg_default;

-- 6. Refunds Table
CREATE TABLE IF NOT EXISTS public.refunds (
  id text not null,
  "orderId" text not null,
  "cfRefundId" text null,
  "refundAmount" numeric(12, 2) not null,
  "refundCurrency" text not null default 'INR'::text,
  "refundNote" text null,
  "refundStatus" public."RefundStatus" not null default 'PENDING'::"RefundStatus",
  "refundType" text not null default 'STANDARD'::text,
  "rawResponse" jsonb null,
  "createdAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone not null,
  constraint refunds_pkey primary key (id),
  constraint "refunds_orderId_fkey" foreign KEY ("orderId") references orders (id) on update CASCADE on delete RESTRICT
) TABLESPACE pg_default;

CREATE UNIQUE INDEX IF NOT EXISTS "refunds_cfRefundId_key" on public.refunds using btree ("cfRefundId") TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS "refunds_orderId_idx" on public.refunds using btree ("orderId") TABLESPACE pg_default;

-- 7. Settlements Table
CREATE TABLE IF NOT EXISTS public.settlements (
  id text not null,
  "cfSettlementId" text not null,
  "settlementAmount" numeric(12, 2) not null,
  "settlementCurrency" text not null default 'INR'::text,
  "utrNumber" text null,
  "settlementDate" timestamp without time zone not null,
  status text not null,
  "rawPayload" jsonb null,
  "createdAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
  constraint settlements_pkey primary key (id)
) TABLESPACE pg_default;

CREATE UNIQUE INDEX IF NOT EXISTS "settlements_cfSettlementId_key" on public.settlements using btree ("cfSettlementId") TABLESPACE pg_default;

-- 8. User Invites Table
CREATE TABLE IF NOT EXISTS public.user_invites (
  id text not null,
  email text not null,
  role text not null default 'EMPLOYEE'::text,
  "allowedAppIds" text[] null default array[]::text[],
  token text not null,
  "expiresAt" timestamp without time zone not null,
  "usedAt" timestamp without time zone null,
  "invitedBy" text null,
  "createdAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
  constraint user_invites_pkey primary key (id)
) TABLESPACE pg_default;

CREATE UNIQUE INDEX IF NOT EXISTS user_invites_token_key on public.user_invites using btree (token) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS user_invites_token_idx on public.user_invites using btree (token) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS user_invites_email_idx on public.user_invites using btree (email) TABLESPACE pg_default;

-- 9. Webhook Outbox Queue Table
CREATE TABLE IF NOT EXISTS public.webhook_outbox_queue (
  id text not null,
  "applicationId" text not null,
  "orderId" text null,
  "eventType" text not null,
  payload jsonb not null,
  status public."WebhookStatus" not null default 'PENDING'::"WebhookStatus",
  attempts integer not null default 0,
  "maxAttempts" integer not null default 5,
  "nextRetryAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
  "responseStatus" integer null,
  "lastError" text null,
  "createdAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone not null,
  constraint webhook_outbox_queue_pkey primary key (id),
  constraint "webhook_outbox_queue_applicationId_fkey" foreign KEY ("applicationId") references applications (id) on update CASCADE on delete CASCADE,
  constraint "webhook_outbox_queue_orderId_fkey" foreign KEY ("orderId") references orders (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "webhook_outbox_queue_status_nextRetryAt_idx" on public.webhook_outbox_queue using btree (status, "nextRetryAt") TABLESPACE pg_default;

-- ------------------------------------------------------------------------------
-- PART 3: STORED PROCEDURES & FUNCTIONS
-- ------------------------------------------------------------------------------

-- Outbox Worker HTTP Dispatcher
CREATE OR REPLACE FUNCTION public.trigger_outbox_worker_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    target_urls_raw TEXT;
    single_url TEXT;
    auth_key TEXT;
BEGIN
    SELECT "value" INTO target_urls_raw FROM public.payment_hub_config WHERE "key" = 'hub_url';
    SELECT "value" INTO auth_key FROM public.payment_hub_config WHERE "key" = 'admin_api_key';

    IF target_urls_raw IS NOT NULL AND length(trim(target_urls_raw)) > 0 THEN
        FOREACH single_url IN ARRAY regexp_split_to_array(target_urls_raw, '[,\s]+') LOOP
            single_url := trim(single_url);
            IF length(single_url) > 0 THEN
                BEGIN
                    PERFORM net.http_post(
                        url := rtrim(single_url, '/') || '/api/v1/cron/outbox-worker',
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer ' || COALESCE(trim(auth_key), '')
                        ),
                        body := '{}'::jsonb,
                        timeout_milliseconds := 5000
                    );
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'trigger_outbox_worker_on_insert error: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron Outbox Worker Invocation
CREATE OR REPLACE FUNCTION public.invoke_outbox_worker_cron()
RETURNS void AS $$
DECLARE
    target_urls_raw TEXT;
    single_url TEXT;
    auth_key TEXT;
BEGIN
    SELECT "value" INTO target_urls_raw FROM public.payment_hub_config WHERE "key" = 'hub_url';
    SELECT "value" INTO auth_key FROM public.payment_hub_config WHERE "key" = 'admin_api_key';

    IF target_urls_raw IS NOT NULL AND length(trim(target_urls_raw)) > 0 THEN
        FOREACH single_url IN ARRAY regexp_split_to_array(target_urls_raw, '[,\s]+') LOOP
            single_url := trim(single_url);
            IF length(single_url) > 0 THEN
                BEGIN
                    PERFORM net.http_post(
                        url := rtrim(single_url, '/') || '/api/v1/cron/outbox-worker',
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer ' || COALESCE(trim(auth_key), '')
                        ),
                        body := '{}'::jsonb,
                        timeout_milliseconds := 5000
                    );
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
        END LOOP;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'invoke_outbox_worker_cron error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stale Order Auto-Expiry (Transitions older than 20 mins to EXPIRED)
CREATE OR REPLACE FUNCTION public.auto_expire_stale_orders(p_max_age_minutes INTEGER DEFAULT 20)
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    UPDATE public.orders
    SET "orderStatus" = 'EXPIRED'::public."OrderStatus",
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "orderStatus" = 'ACTIVE'::public."OrderStatus"
      AND "createdAt" < (CURRENT_TIMESTAMP - (p_max_age_minutes || ' minutes')::interval);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- PART 4: DATABASE TRIGGERS
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_outbox_worker_on_insert ON public.webhook_outbox_queue;
CREATE TRIGGER trg_outbox_worker_on_insert
AFTER INSERT ON public.webhook_outbox_queue
FOR EACH ROW
WHEN (NEW.status = 'PENDING'::public."WebhookStatus")
EXECUTE FUNCTION public.trigger_outbox_worker_on_insert();

-- ------------------------------------------------------------------------------
-- PART 5: CRON JOBS (pg_cron)
-- ------------------------------------------------------------------------------
SELECT cron.unschedule('process-webhook-outbox-every-minute') 
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-webhook-outbox-every-minute'
);

SELECT cron.schedule(
    'process-webhook-outbox-every-minute',
    '* * * * *',
    $$SELECT public.invoke_outbox_worker_cron();$$
);

SELECT cron.unschedule('auto-expire-stale-orders-every-5-min') 
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'auto-expire-stale-orders-every-5-min'
);

SELECT cron.schedule(
    'auto-expire-stale-orders-every-5-min',
    '*/5 * * * *',
    $$SELECT public.auto_expire_stale_orders(20);$$
);
