/*
  # Complete RLS Policy Fix for Dog Registration
  
  This migration addresses the core issue causing dog registration failures:
  - Missing or incorrect RLS policies for profiles and dogs tables
  - Ensures both INSERT and SELECT operations work correctly
  - Provides proper authentication-based access control
*/

-- First, let's check current policies and create debug info
DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== CURRENT POLICIES BEFORE FIX ===';
  FOR r IN (
    SELECT schemaname, tablename, policyname, cmd, roles 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'dogs')
    ORDER BY tablename, cmd
  ) LOOP
    RAISE NOTICE 'Table: %, Policy: %, Command: %, Roles: %', 
      r.tablename, r.policyname, r.cmd, r.roles;
  END LOOP;
END $$;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "プロフィールは本人のみ参照可能" ON profiles;
DROP POLICY IF EXISTS "プロフィールは本人のみ作成可能" ON profiles;
DROP POLICY IF EXISTS "プロフィールは本人のみ更新可能" ON profiles;

DROP POLICY IF EXISTS "dogs_select_own_only" ON dogs;
DROP POLICY IF EXISTS "dogs_insert_own_only" ON dogs;
DROP POLICY IF EXISTS "dogs_update_own_only" ON dogs;
DROP POLICY IF EXISTS "dogs_delete_own_only" ON dogs;
DROP POLICY IF EXISTS "Enable users to view their own data only" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ参照可能" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ作成可能" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ更新可能" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ削除可能" ON dogs;

-- Ensure RLS is enabled on both tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;

-- Create clean, comprehensive policies for profiles
CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_policy"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create clean, comprehensive policies for dogs
CREATE POLICY "dogs_select_policy"
  ON dogs
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "dogs_insert_policy"
  ON dogs
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "dogs_update_policy"
  ON dogs
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "dogs_delete_policy"
  ON dogs
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Ensure proper grants
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dogs TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a test function for debugging (drop first to avoid conflicts)
DROP FUNCTION IF EXISTS test_dog_insert(uuid, text);

CREATE FUNCTION test_dog_insert_debug(test_owner_id uuid, test_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  result json;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Create result object
  result := json_build_object(
    'current_user_id', current_user_id,
    'test_owner_id', test_owner_id,
    'test_name', test_name,
    'user_match', (current_user_id = test_owner_id),
    'profiles_count', (SELECT COUNT(*) FROM profiles WHERE id = test_owner_id),
    'can_insert_profile', (
      SELECT COUNT(*) > 0 
      FROM information_schema.role_table_grants 
      WHERE grantee = 'authenticated' 
      AND table_name = 'profiles' 
      AND privilege_type = 'INSERT'
    ),
    'can_insert_dog', (
      SELECT COUNT(*) > 0 
      FROM information_schema.role_table_grants 
      WHERE grantee = 'authenticated' 
      AND table_name = 'dogs' 
      AND privilege_type = 'INSERT'
    )
  );
  
  RETURN result;
END;
$$;

-- Debug policies after creation
DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== POLICIES AFTER FIX ===';
  FOR r IN (
    SELECT schemaname, tablename, policyname, cmd, roles 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'dogs')
    ORDER BY tablename, cmd
  ) LOOP
    RAISE NOTICE 'Table: %, Policy: %, Command: %, Roles: %', 
      r.tablename, r.policyname, r.cmd, r.roles;
  END LOOP;
END $$;

-- Success message
SELECT 'Complete RLS policies fixed - dog registration should now work properly' as message; 