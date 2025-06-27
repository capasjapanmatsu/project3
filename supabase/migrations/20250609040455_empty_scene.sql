/*
  # Add UPDATE policy for dogs table

  1. Security
    - Add UPDATE policy for `dogs` table to allow owners to update their own dogs
    - This fixes the "更新対象のデータが見つかりませんでした" error when users try to update their dog information

  The dogs table currently has SELECT, INSERT, and DELETE policies but is missing an UPDATE policy,
  which prevents users from modifying their dog records even though they own them.
*/

-- Add UPDATE policy for dogs table
CREATE POLICY "Users can update their own dogs"
  ON dogs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);