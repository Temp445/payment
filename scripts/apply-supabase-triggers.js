const { PrismaClient } = require('@prisma/client');

async function applyTriggers() {
  const prisma = new PrismaClient();
  try {
    console.log("Connecting to Supabase...");

    // 1. Extensions
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_net;`);
    console.log("✔ Extension pg_net verified/created");

    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_cron;`);
    console.log("✔ Extension pg_cron verified/created");

    // 2. Config table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "payment_hub_config" (
        "key" VARCHAR(50) PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✔ Table payment_hub_config verified");

    // 3. Trigger Function (purely queries payment_hub_config)
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION trigger_outbox_worker_on_insert()
      RETURNS TRIGGER AS $$
      DECLARE
          target_url TEXT;
          auth_key TEXT;
      BEGIN
          SELECT "value" INTO target_url FROM "payment_hub_config" WHERE "key" = 'hub_url';
          SELECT "value" INTO auth_key FROM "payment_hub_config" WHERE "key" = 'admin_api_key';

          IF target_url IS NOT NULL AND length(trim(target_url)) > 0 THEN
              PERFORM net.http_post(
                  url := rtrim(trim(target_url), '/') || '/api/v1/cron/outbox-worker',
                  headers := jsonb_build_object(
                      'Content-Type', 'application/json',
                      'Authorization', 'Bearer ' || COALESCE(trim(auth_key), '')
                  ),
                  body := '{}'::jsonb,
                  timeout_milliseconds := 5000
              );
          END IF;

          RETURN NEW;
      EXCEPTION
          WHEN OTHERS THEN
              RAISE WARNING 'trigger_outbox_worker_on_insert failed: %', SQLERRM;
              RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log("✔ Function trigger_outbox_worker_on_insert() updated to dynamically fetch from database");

    // 4. Attach Trigger
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_outbox_worker_on_insert ON "webhook_outbox_queue";`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_outbox_worker_on_insert
      AFTER INSERT ON "webhook_outbox_queue"
      FOR EACH ROW
      WHEN (NEW.status = 'PENDING')
      EXECUTE FUNCTION trigger_outbox_worker_on_insert();
    `);
    console.log("✔ Database trigger trg_outbox_worker_on_insert attached to webhook_outbox_queue");

    // 5. Cron Helper Function
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION invoke_outbox_worker_cron()
      RETURNS void AS $$
      DECLARE
          target_url TEXT;
          auth_key TEXT;
      BEGIN
          SELECT "value" INTO target_url FROM "payment_hub_config" WHERE "key" = 'hub_url';
          SELECT "value" INTO auth_key FROM "payment_hub_config" WHERE "key" = 'admin_api_key';

          IF target_url IS NOT NULL AND length(trim(target_url)) > 0 THEN
              PERFORM net.http_post(
                  url := rtrim(trim(target_url), '/') || '/api/v1/cron/outbox-worker',
                  headers := jsonb_build_object(
                      'Content-Type', 'application/json',
                      'Authorization', 'Bearer ' || COALESCE(trim(auth_key), '')
                  ),
                  body := '{}'::jsonb,
                  timeout_milliseconds := 5000
              );
          END IF;
      EXCEPTION
          WHEN OTHERS THEN
              RAISE WARNING 'invoke_outbox_worker_cron error: %', SQLERRM;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log("✔ Helper function invoke_outbox_worker_cron() created");

    // 6. pg_cron schedule
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'payment-hub-outbox-worker-cron';
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;
      `);
      await prisma.$executeRawUnsafe(`
        SELECT cron.schedule(
          'payment-hub-outbox-worker-cron',
          '*/2 * * * *',
          'SELECT invoke_outbox_worker_cron();'
        );
      `);
      console.log("✔ Fallback pg_cron job 'payment-hub-outbox-worker-cron' updated to invoke database-driven function");
    } catch (cronErr) {
      console.log("ℹ pg_cron setup note:", cronErr.message);
    }

    console.log("\n🚀 Dynamic database-driven triggers and cron successfully applied to Supabase!");
  } catch (err) {
    console.error("Setup error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

applyTriggers();
