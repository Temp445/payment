-- ==============================================================================
-- TENANT APPLICATION DATABASE SYNC SCHEMA (For apps that have their own database)
-- Run this in your application database (e.g. Supabase, PostgreSQL, MySQL)
-- ==============================================================================

-- 1. App Subscriptions (Local License & Entitlements Mirror)
CREATE TABLE IF NOT EXISTS public.app_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  organization_id text NOT NULL UNIQUE,       -- Links to your tenant/company/org table
  product_code text NOT NULL,                  -- e.g. 'PAYROLL', 'REAL_ESTATE_CRM'
  tier text NOT NULL,                          -- 'Starter', 'Professional', 'Enterprise'
  tier_level integer DEFAULT 1,
  user_limit integer DEFAULT 5,
  features jsonb DEFAULT '[]'::jsonb,          -- e.g. ["face_recognition", "attendance"]
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  ends_on date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Index for instant lookup on user request
CREATE INDEX IF NOT EXISTS idx_app_subs_org ON public.app_subscriptions(organization_id);

-- 2. App Payment Transactions (Local Billing & Invoices Ledger)
CREATE TABLE IF NOT EXISTS public.app_payment_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  gateway_order_id text NOT NULL UNIQUE,       -- Payment Hub Order Reference
  gateway_payment_id text,                     -- Cashfree/Gateway Payment ID
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'PAID',
  receipt_number text,
  tier text,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_pay_org ON public.app_payment_transactions(organization_id);

-- ==============================================================================
-- 3. STANDARD WEBHOOK HANDLER LOGIC (Next.js / Node.js Express / Supabase Edge)
-- When Payment Hub sends a signed PAYMENT.SUCCESS webhook, execute this upsert:
--
-- INSERT INTO public.app_subscriptions (
--   organization_id, product_code, tier, tier_level, user_limit, features, starts_on, ends_on, is_active, updated_at
-- ) VALUES (
--   $1, $2, $3, $4, $5, $6::jsonb, $7::date, $8::date, true, now()
-- )
-- ON CONFLICT (organization_id)
-- DO UPDATE SET
--   tier = EXCLUDED.tier,
--   tier_level = EXCLUDED.tier_level,
--   user_limit = EXCLUDED.user_limit,
--   features = EXCLUDED.features,
--   starts_on = EXCLUDED.starts_on,
--   ends_on = EXCLUDED.ends_on,
--   is_active = true,
--   updated_at = now();
-- ==============================================================================

