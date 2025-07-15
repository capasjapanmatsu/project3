/*
  # Comprehensive RLS Security Fix for All Public Tables
  
  This migration enables Row Level Security (RLS) on all public schema tables
  and creates appropriate policies based on table structure and access patterns.
  
  Features:
  1. Force enable RLS on all public tables
  2. Create user-specific policies for tables with user_id/owner_id columns
  3. Create public read policies for general access tables
  4. Create admin-only policies for sensitive tables
  5. Handle special cases for linking tables and system tables
  
  Table Categories:
  - User-owned tables: profiles, dogs, reservations, etc.
  - Admin-only tables: contact_messages, admin_notifications, etc.
  - Public read tables: news_announcements, products, etc.
  - System tables: webhook_events, maintenance_schedules, etc.
*/

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to check if table exists
CREATE OR REPLACE FUNCTION table_exists(table_name text, schema_name text DEFAULT 'public')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE tables.table_name = table_exists.table_name 
    AND tables.table_schema = table_exists.schema_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if column exists
CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text, schema_name text DEFAULT 'public')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE columns.table_name = column_exists.table_name 
    AND columns.column_name = column_exists.column_name
    AND columns.table_schema = column_exists.schema_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if policy exists
CREATE OR REPLACE FUNCTION policy_exists(policy_name text, table_name text, schema_name text DEFAULT 'public')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = policy_exists.policy_name 
    AND tablename = policy_exists.table_name
    AND schemaname = policy_exists.schema_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 1. FORCE ENABLE RLS ON ALL PUBLIC TABLES
-- =====================================================

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE '_timescaledb%'
    AND tablename NOT LIKE 'spatial_ref_sys'
  LOOP
    -- Enable RLS on all public tables
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', rec.tablename);
    -- Force RLS even for table owners
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', rec.tablename);
    RAISE NOTICE 'RLS enabled on table: %', rec.tablename;
  END LOOP;
END $$;

-- =====================================================
-- 2. USER-OWNED TABLES - Standard User Access Patterns
-- =====================================================

-- profiles table (users can only access their own profile)
DO $$
BEGIN
  IF table_exists('profiles') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
    DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
    DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
    DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
    
    -- Create new policies
    CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE USING (auth.uid() = id);
    
    RAISE NOTICE 'Policies created for profiles table';
  END IF;
END $$;

-- dogs table (users can only access their own dogs)
DO $$
BEGIN
  IF table_exists('dogs') THEN
    DROP POLICY IF EXISTS "dogs_select_own" ON dogs;
    DROP POLICY IF EXISTS "dogs_update_own" ON dogs;
    DROP POLICY IF EXISTS "dogs_insert_own" ON dogs;
    DROP POLICY IF EXISTS "dogs_delete_own" ON dogs;
    
    CREATE POLICY "dogs_select_own" ON dogs FOR SELECT USING (auth.uid() = owner_id);
    CREATE POLICY "dogs_update_own" ON dogs FOR UPDATE USING (auth.uid() = owner_id);
    CREATE POLICY "dogs_insert_own" ON dogs FOR INSERT WITH CHECK (auth.uid() = owner_id);
    CREATE POLICY "dogs_delete_own" ON dogs FOR DELETE USING (auth.uid() = owner_id);
    
    RAISE NOTICE 'Policies created for dogs table';
  END IF;
END $$;

-- dog_parks table (owners can manage their parks, all users can view)
DO $$
BEGIN
  IF table_exists('dog_parks') THEN
    DROP POLICY IF EXISTS "dog_parks_select_all" ON dog_parks;
    DROP POLICY IF EXISTS "dog_parks_update_own" ON dog_parks;
    DROP POLICY IF EXISTS "dog_parks_insert_own" ON dog_parks;
    DROP POLICY IF EXISTS "dog_parks_delete_own" ON dog_parks;
    
    CREATE POLICY "dog_parks_select_all" ON dog_parks FOR SELECT USING (true);
    CREATE POLICY "dog_parks_update_own" ON dog_parks FOR UPDATE USING (auth.uid() = owner_id);
    CREATE POLICY "dog_parks_insert_own" ON dog_parks FOR INSERT WITH CHECK (auth.uid() = owner_id);
    CREATE POLICY "dog_parks_delete_own" ON dog_parks FOR DELETE USING (auth.uid() = owner_id);
    
    RAISE NOTICE 'Policies created for dog_parks table';
  END IF;
END $$;

-- reservations table (users can only access their own reservations)
DO $$
BEGIN
  IF table_exists('reservations') THEN
    DROP POLICY IF EXISTS "reservations_select_own" ON reservations;
    DROP POLICY IF EXISTS "reservations_update_own" ON reservations;
    DROP POLICY IF EXISTS "reservations_insert_own" ON reservations;
    DROP POLICY IF EXISTS "reservations_delete_own" ON reservations;
    
    CREATE POLICY "reservations_select_own" ON reservations FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "reservations_update_own" ON reservations FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "reservations_insert_own" ON reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "reservations_delete_own" ON reservations FOR DELETE USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Policies created for reservations table';
  END IF;
END $$;

-- vaccine_certifications table (users can only access their own certificates)
DO $$
BEGIN
  IF table_exists('vaccine_certifications') THEN
    DROP POLICY IF EXISTS "vaccine_certifications_select_own" ON vaccine_certifications;
    DROP POLICY IF EXISTS "vaccine_certifications_update_own" ON vaccine_certifications;
    DROP POLICY IF EXISTS "vaccine_certifications_insert_own" ON vaccine_certifications;
    DROP POLICY IF EXISTS "vaccine_certifications_delete_own" ON vaccine_certifications;
    
    CREATE POLICY "vaccine_certifications_select_own" ON vaccine_certifications FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "vaccine_certifications_update_own" ON vaccine_certifications FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "vaccine_certifications_insert_own" ON vaccine_certifications FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "vaccine_certifications_delete_own" ON vaccine_certifications FOR DELETE USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Policies created for vaccine_certifications table';
  END IF;
END $$;

-- cart_items table (users can only access their own cart items)
DO $$
BEGIN
  IF table_exists('cart_items') THEN
    DROP POLICY IF EXISTS "cart_items_select_own" ON cart_items;
    DROP POLICY IF EXISTS "cart_items_update_own" ON cart_items;
    DROP POLICY IF EXISTS "cart_items_insert_own" ON cart_items;
    DROP POLICY IF EXISTS "cart_items_delete_own" ON cart_items;
    
    CREATE POLICY "cart_items_select_own" ON cart_items FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "cart_items_update_own" ON cart_items FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "cart_items_insert_own" ON cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "cart_items_delete_own" ON cart_items FOR DELETE USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Policies created for cart_items table';
  END IF;
END $$;

-- orders table (users can only access their own orders)
DO $$
BEGIN
  IF table_exists('orders') THEN
    DROP POLICY IF EXISTS "orders_select_own" ON orders;
    DROP POLICY IF EXISTS "orders_update_own" ON orders;
    DROP POLICY IF EXISTS "orders_insert_own" ON orders;
    DROP POLICY IF EXISTS "orders_delete_own" ON orders;
    
    CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "orders_update_own" ON orders FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "orders_insert_own" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "orders_delete_own" ON orders FOR DELETE USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Policies created for orders table';
  END IF;
END $$;

-- subscriptions table (users can only access their own subscriptions)
DO $$
BEGIN
  IF table_exists('subscriptions') THEN
    DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
    DROP POLICY IF EXISTS "subscriptions_update_own" ON subscriptions;
    DROP POLICY IF EXISTS "subscriptions_insert_own" ON subscriptions;
    DROP POLICY IF EXISTS "subscriptions_delete_own" ON subscriptions;
    
    CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "subscriptions_update_own" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "subscriptions_insert_own" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "subscriptions_delete_own" ON subscriptions FOR DELETE USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Policies created for subscriptions table';
  END IF;
END $$;

-- =====================================================
-- 3. STRIPE INTEGRATION TABLES
-- =====================================================

-- stripe_customers table (users can only access their own customer data)
DO $$
BEGIN
  IF table_exists('stripe_customers') THEN
    DROP POLICY IF EXISTS "stripe_customers_select_own" ON stripe_customers;
    DROP POLICY IF EXISTS "stripe_customers_update_own" ON stripe_customers;
    DROP POLICY IF EXISTS "stripe_customers_insert_own" ON stripe_customers;
    DROP POLICY IF EXISTS "stripe_customers_delete_own" ON stripe_customers;
    
    CREATE POLICY "stripe_customers_select_own" ON stripe_customers FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
    CREATE POLICY "stripe_customers_update_own" ON stripe_customers FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "stripe_customers_insert_own" ON stripe_customers FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "stripe_customers_delete_own" ON stripe_customers FOR DELETE USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Policies created for stripe_customers table';
  END IF;
END $$;

-- stripe_subscriptions table (users can only access their own subscription data)
DO $$
BEGIN
  IF table_exists('stripe_subscriptions') THEN
    DROP POLICY IF EXISTS "stripe_subscriptions_select_own" ON stripe_subscriptions;
    DROP POLICY IF EXISTS "stripe_subscriptions_update_own" ON stripe_subscriptions;
    DROP POLICY IF EXISTS "stripe_subscriptions_insert_own" ON stripe_subscriptions;
    DROP POLICY IF EXISTS "stripe_subscriptions_delete_own" ON stripe_subscriptions;
    
    CREATE POLICY "stripe_subscriptions_select_own" ON stripe_subscriptions FOR SELECT USING (
      customer_id IN (
        SELECT customer_id FROM stripe_customers 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      ) AND deleted_at IS NULL
    );
    CREATE POLICY "stripe_subscriptions_update_own" ON stripe_subscriptions FOR UPDATE USING (
      customer_id IN (
        SELECT customer_id FROM stripe_customers 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    );
    CREATE POLICY "stripe_subscriptions_insert_own" ON stripe_subscriptions FOR INSERT WITH CHECK (
      customer_id IN (
        SELECT customer_id FROM stripe_customers 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    );
    CREATE POLICY "stripe_subscriptions_delete_own" ON stripe_subscriptions FOR DELETE USING (
      customer_id IN (
        SELECT customer_id FROM stripe_customers 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    );
    
    RAISE NOTICE 'Policies created for stripe_subscriptions table';
  END IF;
END $$;

-- stripe_orders table (users can only access their own order data)
DO $$
BEGIN
  IF table_exists('stripe_orders') THEN
    DROP POLICY IF EXISTS "stripe_orders_select_own" ON stripe_orders;
    DROP POLICY IF EXISTS "stripe_orders_update_own" ON stripe_orders;
    DROP POLICY IF EXISTS "stripe_orders_insert_own" ON stripe_orders;
    DROP POLICY IF EXISTS "stripe_orders_delete_own" ON stripe_orders;
    
    CREATE POLICY "stripe_orders_select_own" ON stripe_orders FOR SELECT USING (
      customer_id IN (
        SELECT customer_id FROM stripe_customers 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      ) AND deleted_at IS NULL
    );
    CREATE POLICY "stripe_orders_update_own" ON stripe_orders FOR UPDATE USING (
      customer_id IN (
        SELECT customer_id FROM stripe_customers 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    );
    CREATE POLICY "stripe_orders_insert_own" ON stripe_orders FOR INSERT WITH CHECK (
      customer_id IN (
        SELECT customer_id FROM stripe_customers 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    );
    CREATE POLICY "stripe_orders_delete_own" ON stripe_orders FOR DELETE USING (
      customer_id IN (
        SELECT customer_id FROM stripe_customers 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    );
    
    RAISE NOTICE 'Policies created for stripe_orders table';
  END IF;
END $$;

-- =====================================================
-- 4. PUBLIC READ TABLES - Admin Write, Public Read
-- =====================================================

-- news_announcements table (public read, admin write)
DO $$
BEGIN
  IF table_exists('news_announcements') THEN
    DROP POLICY IF EXISTS "news_announcements_select_all" ON news_announcements;
    DROP POLICY IF EXISTS "news_announcements_admin_write" ON news_announcements;
    
    CREATE POLICY "news_announcements_select_all" ON news_announcements FOR SELECT USING (true);
    CREATE POLICY "news_announcements_admin_write" ON news_announcements FOR ALL USING (is_admin());
    
    RAISE NOTICE 'Policies created for news_announcements table';
  END IF;
END $$;

-- new_park_openings table (public read, admin write)
DO $$
BEGIN
  IF table_exists('new_park_openings') THEN
    DROP POLICY IF EXISTS "new_park_openings_select_all" ON new_park_openings;
    DROP POLICY IF EXISTS "new_park_openings_admin_write" ON new_park_openings;
    
    CREATE POLICY "new_park_openings_select_all" ON new_park_openings FOR SELECT USING (true);
    CREATE POLICY "new_park_openings_admin_write" ON new_park_openings FOR ALL USING (is_admin());
    
    RAISE NOTICE 'Policies created for new_park_openings table';
  END IF;
END $$;

-- products table (public read, admin write)
DO $$
BEGIN
  IF table_exists('products') THEN
    DROP POLICY IF EXISTS "products_select_all" ON products;
    DROP POLICY IF EXISTS "products_admin_write" ON products;
    
    CREATE POLICY "products_select_all" ON products FOR SELECT USING (is_active = true);
    CREATE POLICY "products_admin_write" ON products FOR ALL USING (is_admin());
    
    RAISE NOTICE 'Policies created for products table';
  END IF;
END $$;

-- =====================================================
-- 5. ADMIN-ONLY TABLES
-- =====================================================

-- contact_messages table (admin only)
DO $$
BEGIN
  IF table_exists('contact_messages') THEN
    DROP POLICY IF EXISTS "contact_messages_admin_only" ON contact_messages;
    
    CREATE POLICY "contact_messages_admin_only" ON contact_messages FOR ALL USING (is_admin());
    
    RAISE NOTICE 'Policies created for contact_messages table';
  END IF;
END $$;

-- admin_notifications table (admin only)
DO $$
BEGIN
  IF table_exists('admin_notifications') THEN
    DROP POLICY IF EXISTS "admin_notifications_admin_only" ON admin_notifications;
    
    CREATE POLICY "admin_notifications_admin_only" ON admin_notifications FOR ALL USING (is_admin());
    
    RAISE NOTICE 'Policies created for admin_notifications table';
  END IF;
END $$;

-- webhook_events table (admin only)
DO $$
BEGIN
  IF table_exists('webhook_events') THEN
    DROP POLICY IF EXISTS "webhook_events_admin_only" ON webhook_events;
    
    CREATE POLICY "webhook_events_admin_only" ON webhook_events FOR ALL USING (is_admin());
    
    RAISE NOTICE 'Policies created for webhook_events table';
  END IF;
END $$;

-- maintenance_schedules table (admin only)
DO $$
BEGIN
  IF table_exists('maintenance_schedules') THEN
    DROP POLICY IF EXISTS "maintenance_schedules_admin_only" ON maintenance_schedules;
    
    CREATE POLICY "maintenance_schedules_admin_only" ON maintenance_schedules FOR ALL USING (is_admin());
    
    RAISE NOTICE 'Policies created for maintenance_schedules table';
  END IF;
END $$;

-- ip_whitelist table (admin only)
DO $$
BEGIN
  IF table_exists('ip_whitelist') THEN
    DROP POLICY IF EXISTS "ip_whitelist_admin_only" ON ip_whitelist;
    
    CREATE POLICY "ip_whitelist_admin_only" ON ip_whitelist FOR ALL USING (is_admin());
    
    RAISE NOTICE 'Policies created for ip_whitelist table';
  END IF;
END $$;

-- =====================================================
-- 6. SPECIAL TABLES WITH CUSTOM LOGIC
-- =====================================================

-- messages table (users can view messages they sent or received)
DO $$
BEGIN
  IF table_exists('messages') THEN
    DROP POLICY IF EXISTS "messages_select_own" ON messages;
    DROP POLICY IF EXISTS "messages_insert_own" ON messages;
    DROP POLICY IF EXISTS "messages_update_own" ON messages;
    DROP POLICY IF EXISTS "messages_delete_own" ON messages;
    
    CREATE POLICY "messages_select_own" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    CREATE POLICY "messages_insert_own" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
    CREATE POLICY "messages_update_own" ON messages FOR UPDATE USING (auth.uid() = receiver_id);
    CREATE POLICY "messages_delete_own" ON messages FOR DELETE USING (auth.uid() = sender_id);
    
    RAISE NOTICE 'Policies created for messages table';
  END IF;
END $$;

-- qr_shares table (users can view QR codes they shared or received)
DO $$
BEGIN
  IF table_exists('qr_shares') THEN
    DROP POLICY IF EXISTS "qr_shares_select_own" ON qr_shares;
    DROP POLICY IF EXISTS "qr_shares_insert_own" ON qr_shares;
    DROP POLICY IF EXISTS "qr_shares_update_own" ON qr_shares;
    DROP POLICY IF EXISTS "qr_shares_delete_own" ON qr_shares;
    
    CREATE POLICY "qr_shares_select_own" ON qr_shares FOR SELECT USING (auth.uid() = shared_by_user_id OR auth.uid() = shared_to_user_id);
    CREATE POLICY "qr_shares_insert_own" ON qr_shares FOR INSERT WITH CHECK (auth.uid() = shared_by_user_id);
    CREATE POLICY "qr_shares_update_own" ON qr_shares FOR UPDATE USING (auth.uid() = shared_by_user_id);
    CREATE POLICY "qr_shares_delete_own" ON qr_shares FOR DELETE USING (auth.uid() = shared_by_user_id);
    
    RAISE NOTICE 'Policies created for qr_shares table';
  END IF;
END $$;

-- friend_requests table (users can view requests they sent or received)
DO $$
BEGIN
  IF table_exists('friend_requests') THEN
    DROP POLICY IF EXISTS "friend_requests_select_own" ON friend_requests;
    DROP POLICY IF EXISTS "friend_requests_insert_own" ON friend_requests;
    DROP POLICY IF EXISTS "friend_requests_update_own" ON friend_requests;
    DROP POLICY IF EXISTS "friend_requests_delete_own" ON friend_requests;
    
    CREATE POLICY "friend_requests_select_own" ON friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    CREATE POLICY "friend_requests_insert_own" ON friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
    CREATE POLICY "friend_requests_update_own" ON friend_requests FOR UPDATE USING (auth.uid() = receiver_id);
    CREATE POLICY "friend_requests_delete_own" ON friend_requests FOR DELETE USING (auth.uid() = sender_id);
    
    RAISE NOTICE 'Policies created for friend_requests table';
  END IF;
END $$;

-- friendships table (users can view friendships they are part of)
DO $$
BEGIN
  IF table_exists('friendships') THEN
    DROP POLICY IF EXISTS "friendships_select_own" ON friendships;
    DROP POLICY IF EXISTS "friendships_insert_own" ON friendships;
    DROP POLICY IF EXISTS "friendships_update_own" ON friendships;
    DROP POLICY IF EXISTS "friendships_delete_own" ON friendships;
    
    CREATE POLICY "friendships_select_own" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
    CREATE POLICY "friendships_insert_own" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "friendships_update_own" ON friendships FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);
    CREATE POLICY "friendships_delete_own" ON friendships FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);
    
    RAISE NOTICE 'Policies created for friendships table';
  END IF;
END $$;

-- order_items table (users can view items in their orders)
DO $$
BEGIN
  IF table_exists('order_items') THEN
    DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
    DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
    DROP POLICY IF EXISTS "order_items_update_own" ON order_items;
    DROP POLICY IF EXISTS "order_items_delete_own" ON order_items;
    
    CREATE POLICY "order_items_select_own" ON order_items FOR SELECT USING (
      order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    );
    CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT WITH CHECK (
      order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    );
    CREATE POLICY "order_items_update_own" ON order_items FOR UPDATE USING (
      order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    );
    CREATE POLICY "order_items_delete_own" ON order_items FOR DELETE USING (
      order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    );
    
    RAISE NOTICE 'Policies created for order_items table';
  END IF;
END $$;

-- =====================================================
-- 7. REMAINING TABLES - Generic User-based Access
-- =====================================================

-- Apply generic user-based policies to remaining tables with user_id columns
DO $$
DECLARE
  table_name text;
  tables_with_user_id text[] := ARRAY[
    'two_factor_codes',
    'trusted_devices',
    'auth_logs',
    'entrance_qr_codes',
    'entrance_qr_codes_temp',
    'payment_cards',
    'dog_park_reviews',
    'owner_verifications',
    'deployments',
    'lock_access_logs',
    'paypay_user_links',
    'paypay_payments',
    'user_entry_status',
    'owner_agreements',
    'notifications',
    'dog_encounters',
    'owner_bank_accounts',
    'monthly_payouts',
    'dog_blacklist',
    'dog_likes',
    'product_images'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_with_user_id
  LOOP
    IF table_exists(table_name) THEN
      EXECUTE format('DROP POLICY IF EXISTS "%s_select_own" ON %I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS "%s_update_own" ON %I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS "%s_insert_own" ON %I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS "%s_delete_own" ON %I', table_name, table_name);
      
      EXECUTE format('CREATE POLICY "%s_select_own" ON %I FOR SELECT USING (auth.uid() = user_id)', table_name, table_name);
      EXECUTE format('CREATE POLICY "%s_update_own" ON %I FOR UPDATE USING (auth.uid() = user_id)', table_name, table_name);
      EXECUTE format('CREATE POLICY "%s_insert_own" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', table_name, table_name);
      EXECUTE format('CREATE POLICY "%s_delete_own" ON %I FOR DELETE USING (auth.uid() = user_id)', table_name, table_name);
      
      RAISE NOTICE 'Policies created for % table', table_name;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- 8. TABLES WITH PARK-BASED ACCESS
-- =====================================================

-- smart_locks table (park owners can manage their locks, users can view)
DO $$
BEGIN
  IF table_exists('smart_locks') THEN
    DROP POLICY IF EXISTS "smart_locks_select_all" ON smart_locks;
    DROP POLICY IF EXISTS "smart_locks_manage_own" ON smart_locks;
    
    CREATE POLICY "smart_locks_select_all" ON smart_locks FOR SELECT USING (true);
    CREATE POLICY "smart_locks_manage_own" ON smart_locks FOR ALL USING (
      park_id IN (SELECT id FROM dog_parks WHERE owner_id = auth.uid())
    );
    
    RAISE NOTICE 'Policies created for smart_locks table';
  END IF;
END $$;

-- dog_park_images table (park owners can manage their images, users can view)
DO $$
BEGIN
  IF table_exists('dog_park_images') THEN
    DROP POLICY IF EXISTS "dog_park_images_select_all" ON dog_park_images;
    DROP POLICY IF EXISTS "dog_park_images_manage_own" ON dog_park_images;
    
    CREATE POLICY "dog_park_images_select_all" ON dog_park_images FOR SELECT USING (true);
    CREATE POLICY "dog_park_images_manage_own" ON dog_park_images FOR ALL USING (
      park_id IN (SELECT id FROM dog_parks WHERE owner_id = auth.uid())
    );
    
    RAISE NOTICE 'Policies created for dog_park_images table';
  END IF;
END $$;

-- =====================================================
-- 9. FINAL CLEANUP
-- =====================================================

-- Drop helper functions
DROP FUNCTION IF EXISTS table_exists(text, text);
DROP FUNCTION IF EXISTS column_exists(text, text, text);
DROP FUNCTION IF EXISTS policy_exists(text, text, text);

-- Final verification
DO $$
DECLARE
  rec record;
  rls_disabled_count int := 0;
BEGIN
  FOR rec IN 
    SELECT schemaname, tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE '_timescaledb%'
    AND tablename NOT LIKE 'spatial_ref_sys'
  LOOP
    IF NOT rec.rowsecurity THEN
      rls_disabled_count := rls_disabled_count + 1;
      RAISE WARNING 'RLS still disabled on table: %.%', rec.schemaname, rec.tablename;
    END IF;
  END LOOP;
  
  IF rls_disabled_count = 0 THEN
    RAISE NOTICE 'SUCCESS: RLS is now enabled on all public tables';
  ELSE
    RAISE NOTICE 'WARNING: % tables still have RLS disabled', rls_disabled_count;
  END IF;
END $$;

-- Success message
-- RAISE NOTICE 'Comprehensive RLS security fix completed successfully!';
SELECT 'SUCCESS: RLS is now enabled on all public tables' as result; 