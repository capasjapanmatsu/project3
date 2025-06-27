/*
  # Fix entrance QR access code constraint

  1. Changes
    - Remove unique constraint on access_code column to allow multiple dogs per QR code
    - Add regular index for performance on access_code lookups

  This allows the intended functionality where multiple dogs can share the same access code
  for group entry when generating QR codes for multiple dogs at once.
*/

-- Drop the unique constraint (this will also remove the associated index)
ALTER TABLE entrance_qr_codes DROP CONSTRAINT IF EXISTS entrance_qr_codes_access_code_key;

-- Create a regular (non-unique) index for performance
CREATE INDEX IF NOT EXISTS entrance_qr_codes_access_code_idx ON entrance_qr_codes(access_code);