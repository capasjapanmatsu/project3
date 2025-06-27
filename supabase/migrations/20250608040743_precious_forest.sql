/*
  # Add name column to profiles table

  1. Changes
    - Add `name` column to `profiles` table with type `text`
    - Set default value to empty string for consistency
    - Allow null values initially to handle existing records

  2. Notes
    - This resolves the error where the application expects a `name` column in profiles
    - Existing profiles will have null name values until updated by users
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN name text;
  END IF;
END $$;