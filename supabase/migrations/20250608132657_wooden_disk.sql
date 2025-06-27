/*
  # Fix reservations table schema ambiguity

  1. Changes
    - Remove the redundant dog_park_id column from reservations table
    - Keep only park_id column for referencing dog_parks
    - Update foreign key constraints accordingly
    - This resolves the ambiguity in Supabase queries

  2. Data Migration
    - Copy any data from dog_park_id to park_id if needed
    - Remove the old column and constraint
*/

-- First, update any records that might have dog_park_id but not park_id
UPDATE reservations 
SET park_id = dog_park_id 
WHERE park_id IS NULL AND dog_park_id IS NOT NULL;

-- Drop the foreign key constraint for dog_park_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reservations_dog_park_id_fkey'
  ) THEN
    ALTER TABLE reservations DROP CONSTRAINT reservations_dog_park_id_fkey;
  END IF;
END $$;

-- Drop the dog_park_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'dog_park_id'
  ) THEN
    ALTER TABLE reservations DROP COLUMN dog_park_id;
  END IF;
END $$;

-- Ensure park_id is not null
ALTER TABLE reservations ALTER COLUMN park_id SET NOT NULL;

-- Make sure the foreign key constraint for park_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reservations_park_id_fkey'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_park_id_fkey 
      FOREIGN KEY (park_id) REFERENCES dog_parks(id);
  END IF;
END $$;