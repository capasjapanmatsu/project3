/*
  # Add is_public column to pet_facilities table

  1. Changes
    - Add `is_public` column to `pet_facilities` table with type `boolean`
    - Default value is true for approved facilities, false for others
    - Add index for better query performance
    - Update existing approved facilities to be public by default

  2. Notes
    - This enables facility owners to control public visibility
    - Facilities can be approved but still private (not shown in public listings)
    - Only affects approved facilities - pending/rejected facilities remain non-public
*/

-- Add is_public column to pet_facilities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pet_facilities' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE pet_facilities ADD COLUMN is_public boolean DEFAULT false;
  END IF;
END $$;

-- Set existing approved facilities to be public by default
UPDATE pet_facilities 
SET is_public = true 
WHERE status = 'approved' AND is_public IS NULL;

-- Create index for better query performance on public facilities
CREATE INDEX IF NOT EXISTS idx_pet_facilities_is_public ON pet_facilities(is_public);

-- Add comment for documentation
COMMENT ON COLUMN pet_facilities.is_public IS 'Whether the facility is publicly visible in listings (only applies to approved facilities)';

-- Grant necessary permissions
-- (RLS policies remain the same, is_public is an additional filter for public visibility)
