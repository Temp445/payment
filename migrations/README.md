# Centralized Payment Hub Database Migrations

This directory contains the production-ready PostgreSQL / Supabase migration scripts for the Centralized Payment Hub.

## File Structure

| File | Purpose |
| :--- | :--- |
| **`01_tables.sql`** | Core schema: `applications`, `orders`, `payments`, `refunds`, `settlements`, `webhook_outbox_queue`, `audit_logs`, `payment_hub_config`, and `user_invites`. |
| **`02_functions.sql`** | Stored procedures: `trigger_outbox_worker_on_insert()`, `invoke_outbox_worker_cron()`, and `auto_expire_stale_orders()`. |
| **`03_triggers.sql`** | Realtime database triggers: automatic outbox worker notification (`trg_outbox_worker_on_insert`). |
| **`04_cron.sql`** | `pg_cron` jobs: 1-minute retry for webhook outbox and 5-minute auto-expiry for stale orders. |
| **`all_in_one_migration.sql`** | Complete combined master script containing all tables, functions, triggers, and cron jobs in sequential order. |

---

## How to Execute

### Option 1: Supabase Dashboard SQL Editor (Recommended)
1. Open your Supabase project: [https://supabase.com/dashboard/project/etixgqrvyrmoxcdpmjxb/sql](https://supabase.com/dashboard/project/etixgqrvyrmoxcdpmjxb/sql)
2. Create a new query.
3. Copy and paste the contents of `all_in_one_migration.sql`.
4. Click **Run**.

### Option 2: psql Command Line
```bash
psql "postgresql://postgres.etixgqrvyrmoxcdpmjxb:<PASSWORD>@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" -f migrations/all_in_one_migration.sql
```

### Option 3: Prisma Schema Push
For the base table schema, you can also run:
```bash
npx prisma db push
```
