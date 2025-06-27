/*
  # Fix entrance QR access code constraint

  1. Changes
    - Remove unique constraint on access_code to allow multiple dogs to share the same code
    - Create a regular index for performance instead of a unique index

  This migration allows multiple dogs to share the same access code for group entry,
  which is the intended functionality when generating QR codes for multiple dogs.
*/

-- Drop the unique constraint (this will also remove the associated index)
ALTER TABLE entrance_qr_codes DROP CONSTRAINT IF EXISTS entrance_qr_codes_access_code_key;

-- Create a regular (non-unique) index for performance
CREATE INDEX IF NOT EXISTS entrance_qr_codes_access_code_idx ON entrance_qr_codes(access_code);