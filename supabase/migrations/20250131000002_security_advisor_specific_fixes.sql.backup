/*
  # Security Advisor Specific Fixes
  
  This migration specifically addresses the exact issues reported 
  by Supabase Security Advisor:
  
  1. Enable RLS on tables where it's disabled
  2. Add missing policies for public access
  3. Fix policy enforcement issues
  4. Ensure proper authentication checks
*/

-- =====================================================
-- 1. FORCE ENABLE RLS ON ALL FLAGGED TABLES
-- =====================================================

-- List of tables specifically flagged by Security Advisor
DO $$
DECLARE
  flagged_tables TEXT[] := ARRAY[
    'news_announcements',
    'profiles', 
    'vaccine_certifications',
    'contact_messages',
    'subscriptions',
    'stripe_subscriptions',
    'stripe_orders',
    'orders',
    'dog_park_reviews',
    'dogs',
    'reservations',
    'new_park_openings'
  ];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY flagged_tables
  LOOP
    -- Check if table exists and enable RLS
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = table_name
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
      RAISE NOTICE 'RLS enabled on table: %', table_name;
    ELSE
      RAISE NOTICE 'Table does not exist: %', table_name;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- 2. NEWS ANNOUNCEMENTS - SECURITY ADVISOR FIX
-- =====================================================

-- Drop and recreate policies to ensure they work
DROP POLICY IF EXISTS "news_announcements_public_read" ON news_announcements;
DROP POLICY IF EXISTS "news_announcements_admin_all" ON news_announcements;

-- Public read access (anonymous and authenticated)
CREATE POLICY "news_public_select"
  ON news_announcements FOR SELECT
  USING (true);

-- Authenticated users with admin role can manage
CREATE POLICY "news_admin_manage"
  ON news_announcements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
  );

-- =====================================================
-- 3. PROFILES - SECURITY ADVISOR FIX
-- =====================================================

-- Ensure profiles policies are properly set
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;

-- Users can only see their own profile
CREATE POLICY "profiles_own_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can only insert their own profile
CREATE POLICY "profiles_own_insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "profiles_own_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =====================================================
-- 4. VACCINE CERTIFICATIONS - SECURITY ADVISOR FIX
-- =====================================================

-- Ensure proper policies for vaccine certifications
DROP POLICY IF EXISTS "vaccine_certs_owner_select" ON vaccine_certifications;
DROP POLICY IF EXISTS "vaccine_certs_owner_insert" ON vaccine_certifications;
DROP POLICY IF EXISTS "vaccine_certs_owner_update" ON vaccine_certifications;
DROP POLICY IF EXISTS "vaccine_certs_admin_all" ON vaccine_certifications;

-- Users can only access vaccine certs for their own dogs
CREATE POLICY "vaccine_certs_dog_owner_select"
  ON vaccine_certifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = vaccine_certifications.dog_id 
      AND dogs.owner_id = auth.uid()
    )
  );

CREATE POLICY "vaccine_certs_dog_owner_insert"
  ON vaccine_certifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = vaccine_certifications.dog_id 
      AND dogs.owner_id = auth.uid()
    )
  );

CREATE POLICY "vaccine_certs_dog_owner_update"
  ON vaccine_certifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = vaccine_certifications.dog_id 
      AND dogs.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = vaccine_certifications.dog_id 
      AND dogs.owner_id = auth.uid()
    )
  );

-- Admins can manage all vaccine certifications
CREATE POLICY "vaccine_certs_admin_manage"
  ON vaccine_certifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
  );

-- =====================================================
-- 5. DOGS TABLE - SECURITY ADVISOR FIX
-- =====================================================

-- Ensure dogs table has proper policies
DROP POLICY IF EXISTS "dogs_select_policy" ON dogs;
DROP POLICY IF EXISTS "dogs_insert_policy" ON dogs;
DROP POLICY IF EXISTS "dogs_update_policy" ON dogs;
DROP POLICY IF EXISTS "dogs_delete_policy" ON dogs;

-- Users can only access their own dogs
CREATE POLICY "dogs_owner_select"
  ON dogs FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "dogs_owner_insert"
  ON dogs FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "dogs_owner_update"
  ON dogs FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "dogs_owner_delete"
  ON dogs FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- =====================================================
-- 6. CONTACT MESSAGES - SECURITY ADVISOR FIX
-- =====================================================

-- Handle contact_messages if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contact_messages') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "contact_messages_admin_all" ON contact_messages;
    DROP POLICY IF EXISTS "contact_messages_public_insert" ON contact_messages;
    
    -- Public can insert messages
    CREATE POLICY "contact_public_insert"
      ON contact_messages FOR INSERT
      USING (true);
    
    -- Only admins can read messages
    CREATE POLICY "contact_admin_select"
      ON contact_messages FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND user_type = 'admin'
        )
      );
  END IF;
END $$;

-- =====================================================
-- 7. REVIEWS - SECURITY ADVISOR FIX
-- =====================================================

-- Handle dog_park_reviews if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dog_park_reviews') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "dog_park_reviews_public_read" ON dog_park_reviews;
    DROP POLICY IF EXISTS "dog_park_reviews_user_insert" ON dog_park_reviews;
    DROP POLICY IF EXISTS "dog_park_reviews_owner_modify" ON dog_park_reviews;
    DROP POLICY IF EXISTS "dog_park_reviews_owner_delete" ON dog_park_reviews;
    
    -- Public can read reviews
    CREATE POLICY "reviews_public_select"
      ON dog_park_reviews FOR SELECT
      USING (true);
    
    -- Authenticated users can insert reviews
    CREATE POLICY "reviews_user_insert"
      ON dog_park_reviews FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
    
    -- Users can update their own reviews
    CREATE POLICY "reviews_owner_update"
      ON dog_park_reviews FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- 8. SUBSCRIPTION TABLES - SECURITY ADVISOR FIX
-- =====================================================

-- Handle subscriptions table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    DROP POLICY IF EXISTS "subscriptions_owner_access" ON subscriptions;
    DROP POLICY IF EXISTS "subscriptions_admin_all" ON subscriptions;
    
    CREATE POLICY "subscriptions_user_access"
      ON subscriptions FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Handle stripe_subscriptions table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stripe_subscriptions') THEN
    DROP POLICY IF EXISTS "stripe_subscriptions_owner_access" ON stripe_subscriptions;
    DROP POLICY IF EXISTS "stripe_subscriptions_admin_all" ON stripe_subscriptions;
    
    CREATE POLICY "stripe_subs_user_access"
      ON stripe_subscriptions FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Handle stripe_orders table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stripe_orders') THEN
    DROP POLICY IF EXISTS "stripe_orders_owner_access" ON stripe_orders;
    DROP POLICY IF EXISTS "stripe_orders_admin_all" ON stripe_orders;
    
    CREATE POLICY "stripe_orders_user_access"
      ON stripe_orders FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Handle orders table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
    DROP POLICY IF EXISTS "orders_owner_access" ON orders;
    DROP POLICY IF EXISTS "orders_admin_all" ON orders;
    
    CREATE POLICY "orders_user_access"
      ON orders FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- 9. RESERVATIONS - SECURITY ADVISOR FIX
-- =====================================================

-- Handle reservations table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reservations') THEN
    -- Drop any existing policies
    DROP POLICY IF EXISTS "reservations_owner_access" ON reservations;
    DROP POLICY IF EXISTS "reservations_admin_override" ON reservations;
    
    -- Users can only access their own reservations
    CREATE POLICY "reservations_user_access"
      ON reservations FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- 10. ENSURE PROPER GRANTS
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant limited permissions to anonymous users
GRANT SELECT ON news_announcements TO anon;
GRANT INSERT ON contact_messages TO anon;

-- Handle dog_park_reviews for anon if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dog_park_reviews') THEN
    GRANT SELECT ON dog_park_reviews TO anon;
  END IF;
END $$;

-- =====================================================
-- 11. VERIFICATION AND VALIDATION
-- =====================================================

-- Create a function to validate Security Advisor fixes
CREATE OR REPLACE FUNCTION validate_security_advisor_fixes()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  critical_tables TEXT[] := ARRAY[
    'news_announcements', 'profiles', 'vaccine_certifications', 
    'dogs', 'contact_messages', 'subscriptions'
  ];
  table_rec RECORD;
BEGIN
  FOR table_rec IN (
    SELECT 
      c.relname as tbl_name,
      c.rowsecurity as rls_status,
      COALESCE(p.policy_count, 0) as pol_count
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    LEFT JOIN (
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies 
      WHERE schemaname = 'public'
      GROUP BY tablename
    ) p ON c.relname = p.tablename
    WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND c.relname = ANY(critical_tables)
  ) LOOP
    RETURN QUERY SELECT 
      table_rec.tbl_name,
      table_rec.rls_status,
      table_rec.pol_count,
      CASE 
        WHEN table_rec.rls_status AND table_rec.pol_count > 0 THEN 'PASS'
        WHEN NOT table_rec.rls_status THEN 'FAIL: RLS not enabled'
        WHEN table_rec.pol_count = 0 THEN 'FAIL: No policies'
        ELSE 'UNKNOWN'
      END as status;
  END LOOP;
END;
$$;

-- Run validation
SELECT 'Security Advisor specific fixes completed' as message;
SELECT * FROM validate_security_advisor_fixes();

-- Log summary
DO $$
DECLARE
  total_tables INTEGER;
  rls_enabled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tables
  FROM pg_tables WHERE schemaname = 'public';
  
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.rowsecurity = true;
  
  RAISE NOTICE '=== SECURITY ADVISOR FIX SUMMARY ===';
  RAISE NOTICE 'Total public tables: %', total_tables;
  RAISE NOTICE 'Tables with RLS enabled: %', rls_enabled_count;
  RAISE NOTICE 'RLS coverage: %%%', ROUND((rls_enabled_count::NUMERIC / total_tables::NUMERIC) * 100, 2);
END $$;
