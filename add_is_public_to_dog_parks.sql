/*
  # Add is_public column to dog_parks table

  1. Changes
    - Add `is_public` column to `dog_parks` table with type `boolean`
    - Default value is true for approved parks, false for others
    - Add index for better query performance
    - Update existing approved parks to be public by default

  2. Notes
    - This enables park owners to control public visibility
    - Parks can be approved but still private (not shown in public listings)
    - Only affects approved parks - pending/rejected parks remain non-public
*/

-- Add is_public column to dog_parks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dog_parks' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN is_public boolean DEFAULT false;
  END IF;
END $$;

-- Set existing approved parks to be public by default
UPDATE dog_parks 
SET is_public = true 
WHERE status = 'approved' AND is_public IS NULL;

-- Create index for better query performance on public parks
CREATE INDEX IF NOT EXISTS idx_dog_parks_is_public ON dog_parks(is_public);

-- Add comment for documentation
COMMENT ON COLUMN dog_parks.is_public IS 'Whether the park is publicly visible in listings (only applies to approved parks)';

-- Grant necessary permissions
-- (RLS policies remain the same, is_public is an additional filter for public visibility) 