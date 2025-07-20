/*
  # Add nickname column to profiles table

  1. Changes
    - Add `nickname` column to `profiles` table with type `text`
    - Allow null values for existing records
    - Add index for better search performance

  2. Notes
    - This adds the ability for users to set a display nickname
    - Existing profiles will have null nickname values until updated by users
    - Nickname is optional and can be different from the real name
*/

-- Add nickname column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'nickname'
  ) THEN
    ALTER TABLE profiles ADD COLUMN nickname text;
  END IF;
END $$;

-- Create index on nickname for search performance
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON profiles TO authenticated; 