/*
  Security Advisor fixes
  - Set SECURITY INVOKER on sensitive/public-facing views (PostgreSQL 15+)
  - Enable RLS on public tables flagged and add safe policies

  Notes:
  - Each block checks existence before altering to avoid errors on environments
  - Service role bypasses RLS; admin UIs using service role are unaffected
*/

-- 1) Views: switch to SECURITY INVOKER (so RLS applies under caller)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'latest_messages'
  ) THEN
    ALTER VIEW public.latest_messages SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'user_auth_info'
  ) THEN
    ALTER VIEW public.user_auth_info SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_admin_reservation_revenue'
  ) THEN
    ALTER VIEW public.v_admin_reservation_revenue SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_reservation_reminders'
  ) THEN
    ALTER VIEW public.v_reservation_reminders SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_facility_owners'
  ) THEN
    ALTER VIEW public.v_facility_owners SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'facility_rating_summary'
  ) THEN
    ALTER VIEW public.facility_rating_summary SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'admin_unread_inquiries'
  ) THEN
    ALTER VIEW public.admin_unread_inquiries SET (security_invoker = true);
  END IF;
END $$;

-- 2) Tables: enable RLS and add minimal policies

-- public.stripe_product_prices: Public read-only access for price listing (safe exposure)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_product_prices'
  ) THEN
    ALTER TABLE public.stripe_product_prices ENABLE ROW LEVEL SECURITY;

    -- Create SELECT policy for anon + authenticated users if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'stripe_product_prices'
        AND policyname = 'Public can read stripe product prices'
    ) THEN
      CREATE POLICY "Public can read stripe product prices"
        ON public.stripe_product_prices
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- public.admin_action_logs: Restrict to admin account(s)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_action_logs'
  ) THEN
    ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

    -- Allow only specific admin by email via JWT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'admin_action_logs'
        AND policyname = 'Admins (by email) can read logs'
    ) THEN
      CREATE POLICY "Admins (by email) can read logs"
        ON public.admin_action_logs
        FOR SELECT
        TO authenticated
        USING (auth.jwt() ->> 'email' = 'capasjapan@gmail.com');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'admin_action_logs'
        AND policyname = 'Admins (by email) can insert logs'
    ) THEN
      CREATE POLICY "Admins (by email) can insert logs"
        ON public.admin_action_logs
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.jwt() ->> 'email' = 'capasjapan@gmail.com');
    END IF;
  END IF;
END $$;


