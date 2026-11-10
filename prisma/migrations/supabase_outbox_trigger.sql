-- ====================================================================
-- Supabase Automated Outbox Worker Trigger & Cron (pg_net + pg_cron)
-- Multi-URL Support: Dispatches to all configured URLs (e.g. localhost:3000, localhost:3002, Netlify)
-- ====================================================================

-- 1. Enable Required Supabase Extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Configuration Table for Dynamic Webhook Dispatch
CREATE TABLE IF NOT EXISTS "payment_hub_config" (
    "key" VARCHAR(50) PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trigger Function: Dispatches HTTP POST to all configured URLs on INSERT
CREATE OR REPLACE FUNCTION trigger_outbox_worker_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    target_urls_raw TEXT;
    single_url TEXT;
    auth_key TEXT;
BEGIN
    SELECT "value" INTO target_urls_raw FROM "payment_hub_config" WHERE "key" = 'hub_url';
    SELECT "value" INTO auth_key FROM "payment_hub_config" WHERE "key" = 'admin_api_key';

    IF target_urls_raw IS NOT NULL AND length(trim(target_urls_raw)) > 0 THEN
        -- Loop through every comma-separated URL (e.g. localhost:3000, localhost:3002, Netlify)
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
                    -- Ignore failed connections to offline dev ports
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

-- 4. Attach Trigger to webhook_outbox_queue
DROP TRIGGER IF EXISTS trg_outbox_worker_on_insert ON "webhook_outbox_queue";
CREATE TRIGGER trg_outbox_worker_on_insert
AFTER INSERT ON "webhook_outbox_queue"
FOR EACH ROW
WHEN (NEW.status = 'PENDING')
EXECUTE FUNCTION trigger_outbox_worker_on_insert();

-- 5. Helper Function for Scheduled Outbox Processing (pg_cron)
CREATE OR REPLACE FUNCTION invoke_outbox_worker_cron()
RETURNS void AS $$
DECLARE
    target_urls_raw TEXT;
    single_url TEXT;
    auth_key TEXT;
BEGIN
    SELECT "value" INTO target_urls_raw FROM "payment_hub_config" WHERE "key" = 'hub_url';
    SELECT "value" INTO auth_key FROM "payment_hub_config" WHERE "key" = 'admin_api_key';

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

-- 6. Fallback Cron Schedule: Runs every 2 minutes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule(jobid) 
        FROM cron.job 
        WHERE jobname = 'payment-hub-outbox-worker-cron';

        PERFORM cron.schedule(
            'payment-hub-outbox-worker-cron',
            '*/2 * * * *',
            'SELECT invoke_outbox_worker_cron();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'pg_cron setup warning: %', SQLERRM;
END $$;
