-- Add missing product columns used by admin shop management
-- Safe to run multiple times

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_days integer DEFAULT 3;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS has_variations boolean DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variation_type text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variations jsonb DEFAULT '[]'::jsonb;

-- Ensure PostgREST schema cache refreshes
NOTIFY pgrst, 'reload schema';


