-- ==============================================================================
-- 02_FUNCTIONS.SQL: Stored Procedures & Business Logic Functions
-- ==============================================================================

-- 1. Enable Required Supabase Network Extension (for async HTTP dispatch)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Function: Outbox Worker HTTP Dispatcher (pg_net)
-- Reads hub_url and admin_api_key from payment_hub_config and dispatches HTTP POST
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
        -- Loop through every comma-separated URL (e.g. localhost:3000, localhost:3002, production)
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

-- 3. Function: Scheduled Outbox Worker Invocation
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

-- 4. Function: Stale Order Auto-Expiry in Database
-- Automatically transitions any unpaid ACTIVE order older than 20 minutes to EXPIRED
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
