/*
  # Fix Missing Profiles INSERT Policy
  
  The profiles table is missing an INSERT policy, which is causing
  dog registration to fail with RLS violations.
*/

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "プロフィールは本人のみ参照可能" ON profiles;
DROP POLICY IF EXISTS "プロフィールは本人のみ更新可能" ON profiles;

-- Create clean policies for profiles table
-- Users can see their own profile
CREATE POLICY "profiles_select_own"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Ensure proper permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

-- Success message
SELECT 'Fixed profiles INSERT policy - dog registration should now work' as message; 