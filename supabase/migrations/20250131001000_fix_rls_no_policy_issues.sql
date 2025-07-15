/*
  # Fix RLS Enabled No Policy Issues
  
  This migration specifically addresses the Security Advisor "RLS Enabled No Policy" warnings by:
  - Creating proper p    -- RAISE NOTICE 'RLS policies    -- RAISE NOTICE 'RLS polic    -- RAISE NOTICE 'RLS policies created for table o (admin-only access)';
  ELSE
    -- RAISE NOTICE 'Table o does not exist, skipping'; created for email_template_config';
  ELSE
    -- RAISE NOTICE 'Table email_template_config does not exist, skipping';eated for dog_vaccine_certificates';
  ELSE
    -- RAISE NOTICE 'Table dog_vaccine_certificates does not exist, skipping';cies for tables that have RLS enabled but no policies defined
  - Ensuring appropriate access controls for each table type
  - Following the principle of least privilege
  
  Tables addressed based on Security Advisor findings:
  - dog_park_facility_reviews: User-specific access for reviews
  - dog_vaccine_certificates: Owner-specific access with admin oversight
  - email_template_config: Admin-only access for system configuration
  - o: If this is a valid table, will need appropriate policies
*/

-- =====================================================
-- Helper function to check if table exists
-- =====================================================
CREATE OR REPLACE FUNCTION table_exists_check(table_name text, schema_name text DEFAULT 'public')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE tables.table_name = table_exists_check.table_name 
    AND tables.table_schema = table_exists_check.schema_name
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. DOG_PARK_FACILITY_REVIEWS - User review access
-- =====================================================
DO $$
BEGIN
  IF table_exists_check('dog_park_facility_reviews') THEN
    -- Drop any existing policies to avoid conflicts
    DROP POLICY IF EXISTS "facility_reviews_select_all" ON dog_park_facility_reviews;
    DROP POLICY IF EXISTS "facility_reviews_insert_authenticated" ON dog_park_facility_reviews;
    DROP POLICY IF EXISTS "facility_reviews_update_own" ON dog_park_facility_reviews;
    DROP POLICY IF EXISTS "facility_reviews_delete_own" ON dog_park_facility_reviews;
    DROP POLICY IF EXISTS "facility_reviews_admin_all" ON dog_park_facility_reviews;

    -- Allow public to view all reviews (common for review systems)
    CREATE POLICY "facility_reviews_select_all"
      ON dog_park_facility_reviews FOR SELECT
      TO public
      USING (true);

    -- Allow authenticated users to create reviews
    CREATE POLICY "facility_reviews_insert_authenticated"
      ON dog_park_facility_reviews FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);

    -- Allow users to update their own reviews
    CREATE POLICY "facility_reviews_update_own"
      ON dog_park_facility_reviews FOR UPDATE
      TO authenticated
      USING (
        CASE 
          WHEN user_id IS NOT NULL THEN auth.uid() = user_id
          ELSE false
        END
      );

    -- Allow users to delete their own reviews or admins to delete any
    CREATE POLICY "facility_reviews_delete_own"
      ON dog_park_facility_reviews FOR DELETE
      TO authenticated
      USING (
        auth.uid() = user_id OR 
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.user_type IN ('admin', 'superadmin')
        )
      );

    -- Admin can do everything
    CREATE POLICY "facility_reviews_admin_all"
      ON dog_park_facility_reviews FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.user_type IN ('admin', 'superadmin')
        )
      );

    -- RAISE NOTICE 'RLS policies created for dog_park_facility_reviews';
  ELSE
    -- RAISE NOTICE 'Table dog_park_facility_reviews does not exist, skipping';
  END IF;
END $$;

-- =====================================================
-- 2. DOG_VACCINE_CERTIFICATES - Owner/admin access
-- =====================================================
DO $$
BEGIN
  IF table_exists_check('dog_vaccine_certificates') THEN
    -- Drop any existing policies to avoid conflicts
    DROP POLICY IF EXISTS "vaccine_certs_select_own" ON dog_vaccine_certificates;
    DROP POLICY IF EXISTS "vaccine_certs_insert_own" ON dog_vaccine_certificates;
    DROP POLICY IF EXISTS "vaccine_certs_update_own" ON dog_vaccine_certificates;
    DROP POLICY IF EXISTS "vaccine_certs_delete_own" ON dog_vaccine_certificates;
    DROP POLICY IF EXISTS "vaccine_certs_admin_all" ON dog_vaccine_certificates;

    -- Allow users to view their own certificates
    CREATE POLICY "vaccine_certs_select_own"
      ON dog_vaccine_certificates FOR SELECT
      TO authenticated
      USING (
        auth.uid() = user_id OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.user_type IN ('admin', 'superadmin')
        )
      );

    -- Allow users to insert their own certificates
    CREATE POLICY "vaccine_certs_insert_own"
      ON dog_vaccine_certificates FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    -- Allow users to update their own certificates (pending approval)
    CREATE POLICY "vaccine_certs_update_own"
      ON dog_vaccine_certificates FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = user_id OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.user_type IN ('admin', 'superadmin')
        )
      );

    -- Allow users to delete their own certificates or admin to delete any
    CREATE POLICY "vaccine_certs_delete_own"
      ON dog_vaccine_certificates FOR DELETE
      TO authenticated
      USING (
        auth.uid() = user_id OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.user_type IN ('admin', 'superadmin')
        )
      );

    -- Admin can do everything
    CREATE POLICY "vaccine_certs_admin_all"
      ON dog_vaccine_certificates FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.user_type IN ('admin', 'superadmin')
        )
      );

    -- RAISE NOTICE 'RLS policies created for dog_vaccine_certificates';
  ELSE
    -- RAISE NOTICE 'Table dog_vaccine_certificates does not exist, skipping';
  END IF;
END $$;

-- =====================================================
-- 3. EMAIL_TEMPLATE_CONFIG - Admin-only access
-- =====================================================
DO $$
BEGIN
  IF table_exists_check('email_template_config') THEN
    -- Drop any existing policies to avoid conflicts
    DROP POLICY IF EXISTS "email_template_admin_all" ON email_template_config;
    DROP POLICY IF EXISTS "email_template_select_admin" ON email_template_config;
    DROP POLICY IF EXISTS "email_template_insert_admin" ON email_template_config;
    DROP POLICY IF EXISTS "email_template_update_admin" ON email_template_config;
    DROP POLICY IF EXISTS "email_template_delete_admin" ON email_template_config;

    -- Only admins can access email template configuration
    CREATE POLICY "email_template_admin_all"
      ON email_template_config FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.user_type IN ('admin', 'superadmin')
        )
      );

    -- RAISE NOTICE 'RLS policies created for email_template_config';
  ELSE
    -- RAISE NOTICE 'Table email_template_config does not exist, skipping';
  END IF;
END $$;

-- =====================================================
-- 4. TABLE 'o' - Check if valid and create appropriate policies
-- =====================================================
DO $$
BEGIN
  IF table_exists_check('o') THEN
    -- This seems like an unusual table name, but if it exists, we'll secure it
    -- Drop any existing policies to avoid conflicts
    DROP POLICY IF EXISTS "o_table_admin_only" ON o;

    -- Default to admin-only access for unknown table
    CREATE POLICY "o_table_admin_only"
      ON o FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.user_type IN ('admin', 'superadmin')
        )
      );

    -- RAISE NOTICE 'RLS policies created for table o (admin-only access)';
  ELSE
    -- RAISE NOTICE 'Table o does not exist, skipping';
  END IF;
END $$;

-- =====================================================
-- Additional common tables that might have RLS enabled but no policies
-- =====================================================

-- Check for any other tables that might need policies
DO $$
BEGIN
  -- Log completion
  -- RAISE NOTICE 'RLS No Policy fix migration completed successfully';
  -- RAISE NOTICE 'Tables processed: dog_park_facility_reviews, dog_vaccine_certificates, email_template_config, o';
  -- RAISE NOTICE 'Each table now has appropriate RLS policies based on security requirements';
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS table_exists_check(text, text);

-- =====================================================
-- Verification queries (commented out for production)
-- =====================================================

/*
-- Uncomment these to verify policy creation after migration

-- Check RLS status for all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN 'RLS Enabled' ELSE 'RLS Disabled' END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policies for specific tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('dog_park_facility_reviews', 'dog_vaccine_certificates', 'email_template_config', 'o')
ORDER BY tablename, policyname;
*/
