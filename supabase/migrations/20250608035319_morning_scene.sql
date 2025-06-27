/*
  # Add INSERT policy for profiles table

  1. Security Changes
    - Add INSERT policy for profiles table to allow authenticated users to create their own profile
    - Policy ensures users can only insert profiles with their own user ID (auth.uid())

  This fixes the registration error where new users cannot create their profile record.
*/

-- Add INSERT policy for profiles table
CREATE POLICY "プロフィールは本人のみ作成可能"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);