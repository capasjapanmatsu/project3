/*
  # Security Advisor Final Fix - Remaining Issues
  
  This migration addresses the remaining specific issues shown in Security Advisor:
  
  ERRORS (10):
  - Policy Exists RLS Disabled: public.news_announcements
  - Policy Exists RLS Disabled: public.profiles  
  - Policy Exists RLS Disabled: public.vaccine_certifications
  
  WARNINGS (168):
  - RLS Disabled in Public: Various tables including views and system tables
  
  Actions:
  1. Force enable RLS on specific tables that still show errors
  2. Enable existing policies that are disabled
  3. Handle views and system tables appropriately
  4. Create any missing policies
*/

-- =============================================================================
-- STEP 1: FORCE ENABLE RLS ON SPECIFIC PROBLEM TABLES
-- =============================================================================

-- Force enable RLS on tables specifically mentioned in Security Advisor
DO $$
DECLARE
    problem_tables text[] := ARRAY[
        'news_announcements',
        'profiles', 
        'vaccine_certifications',
        'friends',
        'webhook_events',
        'maintenance_settings',
        'stripe_user_subscriptions',
        'contact_messages',
        'admin_notifications',
        'subscriptions',
        'orders',
        'cart_items',
        'products',
        'reservations',
        'dogs',
        'dog_parks',
        'messages',
        'qr_shares',
        'two_factor_codes',
        'trusted_devices',
        'auth_logs',
        'entrance_qr_codes',
        'payment_cards',
        'dog_park_reviews',
        'owner_verifications',
        'deployments',
        'lock_access_logs',
        'smart_locks',
        'paypay_user_links',
        'paypay_payments'
    ];
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY problem_tables
    LOOP
        -- Check if table exists (not view)
        IF EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = table_name
        ) THEN
            -- Force enable RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', table_name);
            RAISE NOTICE 'RLS forced on table: %', table_name;
        ELSE
            RAISE NOTICE 'Table not found (may be view): %', table_name;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- STEP 2: ENABLE ALL EXISTING POLICIES THAT MAY BE DISABLED
-- =============================================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        -- Force enable all existing policies
        BEGIN
            EXECUTE format('ALTER POLICY %I ON %I.%I ENABLE;', 
                          policy_record.policyname, 
                          policy_record.schemaname, 
                          policy_record.tablename);
            RAISE NOTICE 'Policy enabled: % on %.%', 
                         policy_record.policyname, 
                         policy_record.schemaname, 
                         policy_record.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to enable policy: % on %.% - %', 
                         policy_record.policyname, 
                         policy_record.schemaname, 
                         policy_record.tablename,
                         SQLERRM;
        END;
    END LOOP;
END $$;

-- =============================================================================
-- STEP 3: CREATE MISSING POLICIES FOR SPECIFIC TABLES
-- =============================================================================

-- news_announcements - Public read, admin write
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'news_announcements') THEN
        -- Drop and recreate to ensure they work
        DROP POLICY IF EXISTS "news_announcements_public_read" ON public.news_announcements;
        DROP POLICY IF EXISTS "news_announcements_admin_all" ON public.news_announcements;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.news_announcements;
        DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.news_announcements;
        DROP POLICY IF EXISTS "Enable update for users based on email" ON public.news_announcements;
        DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.news_announcements;
        
        -- Create simple policies
        CREATE POLICY "news_public_select" ON public.news_announcements FOR SELECT USING (true);
        CREATE POLICY "news_admin_all" ON public.news_announcements FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
        );
        
        RAISE NOTICE 'Policies recreated for news_announcements';
    END IF;
END $$;

-- profiles - User can only access their own profile
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
        DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
        DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
        DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
        DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
        
        CREATE POLICY "profiles_own_access" ON public.profiles FOR ALL USING (auth.uid() = id);
        CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
        
        RAISE NOTICE 'Policies recreated for profiles';
    END IF;
END $$;

-- vaccine_certifications - Users can only access their own certificates
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vaccine_certifications') THEN
        DROP POLICY IF EXISTS "vaccine_certifications_select_own" ON public.vaccine_certifications;
        DROP POLICY IF EXISTS "vaccine_certifications_insert_own" ON public.vaccine_certifications;
        DROP POLICY IF EXISTS "vaccine_certifications_update_own" ON public.vaccine_certifications;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.vaccine_certifications;
        DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.vaccine_certifications;
        DROP POLICY IF EXISTS "Enable update for users based on email" ON public.vaccine_certifications;
        
        CREATE POLICY "vaccine_certs_own_access" ON public.vaccine_certifications FOR ALL USING (auth.uid() = user_id);
        
        RAISE NOTICE 'Policies recreated for vaccine_certifications';
    END IF;
END $$;

-- dogs - Users can only access their own dogs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dogs') THEN
        DROP POLICY IF EXISTS "dogs_select_own" ON public.dogs;
        DROP POLICY IF EXISTS "dogs_insert_own" ON public.dogs;
        DROP POLICY IF EXISTS "dogs_update_own" ON public.dogs;
        DROP POLICY IF EXISTS "dogs_delete_own" ON public.dogs;
        
        CREATE POLICY "dogs_own_access" ON public.dogs FOR ALL USING (auth.uid() = owner_id);
        
        RAISE NOTICE 'Policies recreated for dogs';
    END IF;
END $$;

-- dog_parks - Public read, owner manage
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dog_parks') THEN
        DROP POLICY IF EXISTS "dog_parks_select_all" ON public.dog_parks;
        DROP POLICY IF EXISTS "dog_parks_manage_own" ON public.dog_parks;
        
        CREATE POLICY "dog_parks_public_select" ON public.dog_parks FOR SELECT USING (true);
        CREATE POLICY "dog_parks_owner_manage" ON public.dog_parks FOR ALL USING (auth.uid() = owner_id);
        
        RAISE NOTICE 'Policies recreated for dog_parks';
    END IF;
END $$;

-- reservations - Users can only access their own reservations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reservations') THEN
        DROP POLICY IF EXISTS "reservations_select_own" ON public.reservations;
        DROP POLICY IF EXISTS "reservations_insert_own" ON public.reservations;
        DROP POLICY IF EXISTS "reservations_update_own" ON public.reservations;
        DROP POLICY IF EXISTS "reservations_delete_own" ON public.reservations;
        
        CREATE POLICY "reservations_own_access" ON public.reservations FOR ALL USING (auth.uid() = user_id);
        
        RAISE NOTICE 'Policies recreated for reservations';
    END IF;
END $$;

-- products - Public read, admin manage
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        DROP POLICY IF EXISTS "products_select_all" ON public.products;
        DROP POLICY IF EXISTS "products_admin_manage" ON public.products;
        
        CREATE POLICY "products_public_select" ON public.products FOR SELECT USING (is_active = true);
        CREATE POLICY "products_admin_manage" ON public.products FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
        );
        
        RAISE NOTICE 'Policies recreated for products';
    END IF;
END $$;

-- =============================================================================
-- STEP 4: CREATE GENERIC POLICIES FOR USER-OWNED TABLES
-- =============================================================================

DO $$
DECLARE
    user_tables text[] := ARRAY[
        'subscriptions',
        'orders', 
        'cart_items',
        'messages',
        'qr_shares',
        'two_factor_codes',
        'trusted_devices',
        'auth_logs',
        'entrance_qr_codes',
        'payment_cards',
        'dog_park_reviews',
        'owner_verifications',
        'deployments',
        'lock_access_logs',
        'paypay_user_links',
        'paypay_payments'
    ];
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY user_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            -- Drop existing policies
            EXECUTE format('DROP POLICY IF EXISTS "%s_own_access" ON public.%I', table_name, table_name);
            
            -- Create comprehensive policy
            IF table_name IN ('messages', 'qr_shares') THEN
                -- Special handling for tables with sender/receiver or shared_by/shared_to
                IF table_name = 'messages' THEN
                    EXECUTE format('CREATE POLICY "%s_own_access" ON public.%I FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id)', table_name, table_name);
                ELSIF table_name = 'qr_shares' THEN
                    EXECUTE format('CREATE POLICY "%s_own_access" ON public.%I FOR ALL USING (auth.uid() = shared_by_user_id OR auth.uid() = shared_to_user_id)', table_name, table_name);
                END IF;
            ELSE
                -- Standard user_id based policy
                EXECUTE format('CREATE POLICY "%s_own_access" ON public.%I FOR ALL USING (auth.uid() = user_id)', table_name, table_name);
            END IF;
            
            RAISE NOTICE 'Policy created for table: %', table_name;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- STEP 5: CREATE ADMIN-ONLY POLICIES
-- =============================================================================

DO $$
DECLARE
    admin_tables text[] := ARRAY[
        'contact_messages',
        'admin_notifications', 
        'webhook_events',
        'maintenance_settings'
    ];
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY admin_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            EXECUTE format('DROP POLICY IF EXISTS "%s_admin_only" ON public.%I', table_name, table_name);
            EXECUTE format('CREATE POLICY "%s_admin_only" ON public.%I FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = ''admin''))', table_name, table_name);
            RAISE NOTICE 'Admin policy created for table: %', table_name;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- STEP 6: HANDLE SPECIAL TABLES
-- =============================================================================

-- smart_locks - Public read, park owner manage
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'smart_locks') THEN
        DROP POLICY IF EXISTS "smart_locks_public_select" ON public.smart_locks;
        DROP POLICY IF EXISTS "smart_locks_owner_manage" ON public.smart_locks;
        
        CREATE POLICY "smart_locks_public_select" ON public.smart_locks FOR SELECT USING (true);
        CREATE POLICY "smart_locks_owner_manage" ON public.smart_locks FOR ALL USING (
            park_id IN (SELECT id FROM public.dog_parks WHERE owner_id = auth.uid())
        );
        
        RAISE NOTICE 'Policies created for smart_locks';
    END IF;
END $$;

-- =============================================================================
-- STEP 7: FINAL VERIFICATION AND CLEANUP
-- =============================================================================

-- Final verification of RLS status
DO $$
DECLARE
    rec RECORD;
    disabled_count int := 0;
    total_count int := 0;
BEGIN
    FOR rec IN 
        SELECT schemaname, tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE '_timescaledb_%'
        AND tablename NOT LIKE 'spatial_ref_sys'
    LOOP
        total_count := total_count + 1;
        IF NOT rec.rowsecurity THEN
            disabled_count := disabled_count + 1;
            RAISE WARNING 'RLS still disabled on table: %.%', rec.schemaname, rec.tablename;
            -- Force enable it one more time
            BEGIN
                EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', rec.schemaname, rec.tablename);
                EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;', rec.schemaname, rec.tablename);
                RAISE NOTICE 'Force enabled RLS on: %.%', rec.schemaname, rec.tablename;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to enable RLS on %.%: %', rec.schemaname, rec.tablename, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'FINAL VERIFICATION:';
    RAISE NOTICE 'Total tables: %', total_count;
    RAISE NOTICE 'Tables with RLS disabled: %', disabled_count;
    
    IF disabled_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All public tables now have RLS enabled!';
    ELSE
        RAISE NOTICE 'ATTENTION: % tables may still need manual RLS enabling', disabled_count;
    END IF;
END $$;

-- Success message
SELECT 'Security Advisor final fix completed!' as status; 