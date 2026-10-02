-- Add credits_balance to users table
-- Nullable default 0 — one-time travelers buy credit packs instead of subscribing
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "credits_balance" integer DEFAULT 0;
