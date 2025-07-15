/*
  # Security Advisor RLS Fix - Complete Solution
  
  This migration addresses ALL Security Advisor warnings:
  - "RLS Disabled in Public" 
  - "Policy Exists RLS Disabled"
  
  Actions:
  1. Enable RLS on all public tables
  2. Force RLS on all public tables
  3. Enable existing policies
  4. Create missing user-owned policies
  5. Create public read policies where appropriate
  6. Create admin-only policies for sensitive tables
*/

-- =============================================================================
-- STEP 1: ENABLE RLS ON ALL PUBLIC TABLES
-- =============================================================================

DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE '_timescaledb_%'
        AND tablename NOT LIKE 'spatial_ref_sys'
    LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', 
                      table_record.schemaname, table_record.tablename);
        
        -- Force RLS (even for table owners)
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;', 
                      table_record.schemaname, table_record.tablename);
        
        RAISE NOTICE 'RLS enabled and forced on table: %.%', 
                     table_record.schemaname, table_record.tablename;
    END LOOP;
END $$;

-- =============================================================================
-- STEP 2: ENABLE ALL EXISTING POLICIES
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
        -- Enable existing policies
        EXECUTE format('ALTER POLICY %I ON %I.%I ENABLE;', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
        
        RAISE NOTICE 'Policy enabled: % on %.%', 
                     policy_record.policyname, 
                     policy_record.schemaname, 
                     policy_record.tablename;
    END LOOP;
END $$;

-- =============================================================================
-- STEP 3: CREATE MISSING POLICIES FOR USER-OWNED TABLES
-- =============================================================================

-- Helper function to check if column exists
CREATE OR REPLACE FUNCTION column_exists_temp(table_name text, column_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = column_exists_temp.table_name 
        AND column_name = column_exists_temp.column_name
    );
END;
$$ LANGUAGE plpgsql;

-- Function to create user-owned policies
CREATE OR REPLACE FUNCTION create_user_policies_temp(table_name text, user_column text DEFAULT 'user_id')
RETURNS void AS $$
DECLARE
    policy_name text;
BEGIN
    -- SELECT policy
    policy_name := format('select_%s_own', table_name);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = table_name AND policyname = policy_name) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() = %I);', 
                      policy_name, table_name, user_column);
    END IF;
    
    -- INSERT policy
    policy_name := format('insert_%s_own', table_name);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = table_name AND policyname = policy_name) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.uid() = %I);', 
                      policy_name, table_name, user_column);
    END IF;
    
    -- UPDATE policy
    policy_name := format('update_%s_own', table_name);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = table_name AND policyname = policy_name) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = %I);', 
                      policy_name, table_name, user_column);
    END IF;
    
    -- DELETE policy
    policy_name := format('delete_%s_own', table_name);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = table_name AND policyname = policy_name) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (auth.uid() = %I);', 
                      policy_name, table_name, user_column);
    END IF;
    
    RAISE NOTICE 'User policies created for table: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 4: APPLY POLICIES TO SPECIFIC TABLES
-- =============================================================================

-- Tables with user_id column
DO $$
DECLARE
    user_tables text[] := ARRAY[
        'profiles', 'reservations', 'vaccine_certifications', 'subscriptions',
        'cart_items', 'orders', 'two_factor_codes', 'trusted_devices', 'auth_logs',
        'entrance_qr_codes', 'entrance_qr_codes_temp', 'payment_cards', 'dog_park_reviews',
        'owner_verifications', 'deployments', 'lock_access_logs', 'paypay_user_links',
        'paypay_payments', 'user_entry_status', 'notifications', 'dog_encounters',
        'owner_bank_accounts', 'monthly_payouts', 'dog_blacklist', 'dog_likes'
    ];
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY user_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            IF column_exists_temp(table_name, 'user_id') THEN
                PERFORM create_user_policies_temp(table_name, 'user_id');
            END IF;
        END IF;
    END LOOP;
END $$;

-- Tables with owner_id column
DO $$
DECLARE
    owner_tables text[] := ARRAY['dogs', 'dog_parks'];
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY owner_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            IF column_exists_temp(table_name, 'owner_id') THEN
                PERFORM create_user_policies_temp(table_name, 'owner_id');
            END IF;
        END IF;
    END LOOP;
END $$;

-- Special case: profiles table (uses id column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        IF column_exists_temp('profiles', 'id') THEN
            PERFORM create_user_policies_temp('profiles', 'id');
        END IF;
    END IF;
END $$;

-- =============================================================================
-- STEP 5: PUBLIC READ TABLES (Everyone can read, admin can write)
-- =============================================================================

-- news_announcements
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'news_announcements') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'news_announcements' AND policyname = 'news_announcements_public_read') THEN
            CREATE POLICY news_announcements_public_read ON public.news_announcements FOR SELECT USING (true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'news_announcements' AND policyname = 'news_announcements_admin_write') THEN
            CREATE POLICY news_announcements_admin_write ON public.news_announcements FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
            );
        END IF;
    END IF;
END $$;

-- new_park_openings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'new_park_openings') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'new_park_openings' AND policyname = 'new_park_openings_public_read') THEN
            CREATE POLICY new_park_openings_public_read ON public.new_park_openings FOR SELECT USING (true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'new_park_openings' AND policyname = 'new_park_openings_admin_write') THEN
            CREATE POLICY new_park_openings_admin_write ON public.new_park_openings FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
            );
        END IF;
    END IF;
END $$;

-- products
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_public_read') THEN
            CREATE POLICY products_public_read ON public.products FOR SELECT USING (is_active = true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_admin_write') THEN
            CREATE POLICY products_admin_write ON public.products FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
            );
        END IF;
    END IF;
END $$;

-- =============================================================================
-- STEP 6: ADMIN-ONLY TABLES
-- =============================================================================

-- Admin-only tables
DO $$
DECLARE
    admin_tables text[] := ARRAY[
        'contact_messages', 'admin_notifications', 'webhook_events', 
        'maintenance_schedules', 'ip_whitelist', 'admin_logs'
    ];
    table_name text;
    policy_name text;
BEGIN
    FOREACH table_name IN ARRAY admin_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            policy_name := format('%s_admin_only', table_name);
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = table_name AND policyname = policy_name) THEN
                EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (
                    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = ''admin'')
                );', policy_name, table_name);
                RAISE NOTICE 'Admin-only policy created for table: %', table_name;
            END IF;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- STEP 7: STRIPE INTEGRATION TABLES
-- =============================================================================

-- stripe_customers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_customers') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_customers' AND policyname = 'stripe_customers_own') THEN
            CREATE POLICY stripe_customers_own ON public.stripe_customers FOR ALL USING (
                auth.uid() = user_id AND deleted_at IS NULL
            );
        END IF;
    END IF;
END $$;

-- stripe_subscriptions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_subscriptions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_subscriptions' AND policyname = 'stripe_subscriptions_own') THEN
            CREATE POLICY stripe_subscriptions_own ON public.stripe_subscriptions FOR ALL USING (
                customer_id IN (
                    SELECT customer_id FROM stripe_customers 
                    WHERE user_id = auth.uid() AND deleted_at IS NULL
                ) AND deleted_at IS NULL
            );
        END IF;
    END IF;
END $$;

-- stripe_orders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_orders') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_orders' AND policyname = 'stripe_orders_own') THEN
            CREATE POLICY stripe_orders_own ON public.stripe_orders FOR ALL USING (
                customer_id IN (
                    SELECT customer_id FROM stripe_customers 
                    WHERE user_id = auth.uid() AND deleted_at IS NULL
                ) AND deleted_at IS NULL
            );
        END IF;
    END IF;
END $$;

-- =============================================================================
-- STEP 8: SPECIAL RELATIONSHIP TABLES
-- =============================================================================

-- messages (sender/receiver access)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_sender_receiver') THEN
            CREATE POLICY messages_sender_receiver ON public.messages FOR ALL USING (
                auth.uid() = sender_id OR auth.uid() = receiver_id
            );
        END IF;
    END IF;
END $$;

-- qr_shares (shared_by/shared_to access)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qr_shares') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qr_shares' AND policyname = 'qr_shares_participants') THEN
            CREATE POLICY qr_shares_participants ON public.qr_shares FOR ALL USING (
                auth.uid() = shared_by_user_id OR auth.uid() = shared_to_user_id
            );
        END IF;
    END IF;
END $$;

-- friend_requests (sender/receiver access)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'friend_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'friend_requests_participants') THEN
            CREATE POLICY friend_requests_participants ON public.friend_requests FOR ALL USING (
                auth.uid() = sender_id OR auth.uid() = receiver_id
            );
        END IF;
    END IF;
END $$;

-- friendships (user/friend access)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'friendships') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'friendships_participants') THEN
            CREATE POLICY friendships_participants ON public.friendships FOR ALL USING (
                auth.uid() = user_id OR auth.uid() = friend_id
            );
        END IF;
    END IF;
END $$;

-- =============================================================================
-- STEP 9: CLEANUP AND VERIFICATION
-- =============================================================================

-- Drop temporary functions
DROP FUNCTION IF EXISTS column_exists_temp(text, text);
DROP FUNCTION IF EXISTS create_user_policies_temp(text, text);

-- Verification query
DO $$
DECLARE
    disabled_count integer;
    total_count integer;
BEGIN
    SELECT COUNT(*) INTO total_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE '_timescaledb_%'
    AND tablename NOT LIKE 'spatial_ref_sys';
    
    SELECT COUNT(*) INTO disabled_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE '_timescaledb_%'
    AND tablename NOT LIKE 'spatial_ref_sys'
    AND NOT rowsecurity;
    
    RAISE NOTICE 'VERIFICATION COMPLETE:';
    RAISE NOTICE 'Total public tables: %', total_count;
    RAISE NOTICE 'Tables with RLS disabled: %', disabled_count;
    
    IF disabled_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All public tables now have RLS enabled!';
    ELSE
        RAISE WARNING 'WARNING: % tables still have RLS disabled', disabled_count;
    END IF;
END $$;

-- Final success message
RAISE NOTICE 'Security Advisor RLS fix completed successfully!';
RAISE NOTICE 'All "RLS Disabled" and "Policy Exists RLS Disabled" issues should now be resolved.'; 