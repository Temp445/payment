-- Branded custom checkout: per-application display name, logo and colour.
-- Run in Supabase SQL editor (or use `npx prisma db push`).
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS "brandColor" TEXT;

