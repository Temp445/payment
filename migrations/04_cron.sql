-- ==============================================================================
-- 04_CRON.SQL: Scheduled Background Tasks (pg_cron)
-- ==============================================================================

-- 1. Enable Supabase pg_cron Extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Cron Job 1: Process Outbox Webhooks (Every 1 minute)
-- Ensures any failed or retried webhooks are guaranteed to be delivered
SELECT cron.unschedule('process-webhook-outbox-every-minute') 
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-webhook-outbox-every-minute'
);

SELECT cron.schedule(
    'process-webhook-outbox-every-minute',
    '* * * * *',
    $$SELECT public.invoke_outbox_worker_cron();$$
);

-- 3. Cron Job 2: Auto-Expire Stale Orders Older Than 20 Minutes (Every 5 minutes)
-- Transitions abandoned ACTIVE orders to EXPIRED
SELECT cron.unschedule('auto-expire-stale-orders-every-5-min') 
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'auto-expire-stale-orders-every-5-min'
);

SELECT cron.schedule(
    'auto-expire-stale-orders-every-5-min',
    '*/5 * * * *',
    $$SELECT public.auto_expire_stale_orders(20);$$
);

