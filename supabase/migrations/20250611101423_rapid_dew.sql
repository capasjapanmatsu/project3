/*
  # Fix entrance QR access code constraint

  1. Changes
    - Remove unique constraint on access_code column in entrance_qr_codes table
    - This allows multiple dogs to share the same access_code for group entry
    - Keep the existing index for performance but remove uniqueness requirement

  2. Security
    - The access_code can now be shared among multiple dogs for the same user
    - This aligns with the intended functionality of allowing up to 3 dogs per QR code
*/

-- First, check if the constraint exists and remove it properly
DO $$
BEGIN
  -- Remove the unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'entrance_qr_codes' 
    AND constraint_name = 'entrance_qr_codes_access_code_key'
  ) THEN
    ALTER TABLE entrance_qr_codes DROP CONSTRAINT entrance_qr_codes_access_code_key;
  END IF;
  
  -- Remove the unique index if it exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'entrance_qr_codes' 
    AND indexname = 'entrance_qr_codes_access_code_key'
  ) THEN
    DROP INDEX entrance_qr_codes_access_code_key;
  END IF;
END $$;

-- Create a non-unique index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_entrance_qr_codes_access_code 
ON entrance_qr_codes(access_code);