/*
  # Final Dogs Policy Fix
  
  The "FOR ALL" policy seems to be causing issues with INSERT operations.
  Let's create explicit policies for each operation type.
*/

-- Drop the problematic "FOR ALL" policy
DROP POLICY IF EXISTS "犬情報は所有者のみ更新可能" ON dogs;

-- Create explicit policies for each operation
CREATE POLICY "犬情報は所有者のみ参照可能_v2"
  ON dogs
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "犬情報は所有者のみ作成可能"
  ON dogs
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "犬情報は所有者のみ更新可能_v2"
  ON dogs
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "犬情報は所有者のみ削除可能_v2"
  ON dogs
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Also ensure the existing SELECT policy is dropped if it exists
DROP POLICY IF EXISTS "犬情報は所有者のみ参照可能" ON dogs;

-- Ensure proper permissions
GRANT ALL ON dogs TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Dogs policies fixed with explicit INSERT, UPDATE, DELETE policies' as message;
