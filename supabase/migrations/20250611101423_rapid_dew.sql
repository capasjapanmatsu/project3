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

-- Remove the unique constraint on access_code
DROP INDEX IF EXISTS entrance_qr_codes_access_code_key;

-- Create a regular (non-unique) index for performance
CREATE INDEX IF NOT EXISTS entrance_qr_codes_access_code_idx ON entrance_qr_codes(access_code);