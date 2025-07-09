/*
  # Cleanup Duplicate RLS Policies for Dogs Table
  
  Remove the problematic "Public read" policy that allows anonymous users
  to access dog data, and ensure we have only one proper SELECT policy.
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable users to view their own data only" ON dogs;
DROP POLICY IF EXISTS "Public read" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ参照可能" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ参照可能_v2" ON dogs;
DROP POLICY IF EXISTS "Users can insert their own dogs" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ作成可能" ON dogs;
DROP POLICY IF EXISTS "Users can update their own dogs" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ更新可能_v2" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ削除可能" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ削除可能_v2" ON dogs;

-- Create clean, proper policies
-- Only authenticated users can see their own dogs (no anonymous access)
CREATE POLICY "dogs_select_own_only"
  ON dogs
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Only authenticated users can insert their own dogs
CREATE POLICY "dogs_insert_own_only"
  ON dogs
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Only authenticated users can update their own dogs
CREATE POLICY "dogs_update_own_only"
  ON dogs
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Only authenticated users can delete their own dogs
CREATE POLICY "dogs_delete_own_only"
  ON dogs
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Ensure proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON dogs TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Cleaned up duplicate policies - now only authenticated users can access their own dogs' as message;
