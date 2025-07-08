/*
  # Fix reservations table schema ambiguity

  1. Changes
    - Ensure consistent column naming in reservations table
    - Use park_id column for referencing dog_parks
    - Update foreign key constraints accordingly
    - This resolves the ambiguity in Supabase queries

  2. Data Migration
    - Skip data migration for non-existent columns
    - Ensure proper constraints are in place
*/

-- Check if dog_park_id column exists before trying to migrate data
DO $$
BEGIN
  -- Only attempt migration if dog_park_id column actually exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'dog_park_id'
  ) THEN
    -- Update any records that might have dog_park_id but not park_id
    UPDATE reservations
    SET park_id = dog_park_id
    WHERE park_id IS NULL AND dog_park_id IS NOT NULL;
    
    -- Drop the old column and its constraint
    ALTER TABLE reservations DROP COLUMN IF EXISTS dog_park_id;
  END IF;
END $$;

-- Ensure park_id column exists and is properly configured
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'park_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN park_id uuid;
  END IF;
END $$;

-- Add foreign key constraint for park_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'reservations' 
    AND constraint_name = 'reservations_park_id_fkey'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'dog_parks'
  ) THEN
    ALTER TABLE reservations 
    ADD CONSTRAINT reservations_park_id_fkey 
    FOREIGN KEY (park_id) REFERENCES dog_parks(id);
  END IF;
END $$;