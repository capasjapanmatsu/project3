/*
  # Fix dog_parks status constraint

  1. Changes
    - Update the dog_parks_status_check constraint to allow 'first_stage_passed' status
    - This enables the park approval workflow to transition parks from 'pending' to 'first_stage_passed'

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions or access control
*/

-- Drop the existing constraint
ALTER TABLE dog_parks DROP CONSTRAINT IF EXISTS dog_parks_status_check;

-- Add the updated constraint with 'first_stage_passed' included
ALTER TABLE dog_parks ADD CONSTRAINT dog_parks_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'first_stage_passed'::text, 'approved'::text, 'rejected'::text]));