/*
  # Fix RLS policies for dog registration

  1. Policy Updates
    - Update dogs table INSERT policy to allow authenticated users to create dogs for themselves
    - Update vaccine_certifications table INSERT policy to allow users to create certifications for their own dogs
    - Add UPDATE policy for vaccine_certifications table

  2. Security
    - Ensure users can only create dogs with their own user ID as owner_id
    - Ensure users can only create vaccine certifications for dogs they own
    - Maintain data integrity and security
*/

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Enable users to insert their own data" ON dogs;
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみ作成可能" ON vaccine_certifications;

-- Create new INSERT policy for dogs table
CREATE POLICY "Users can insert their own dogs"
  ON dogs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Create new INSERT policy for vaccine_certifications table
CREATE POLICY "Users can insert vaccine certifications for their dogs"
  ON vaccine_certifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = vaccine_certifications.dog_id 
      AND dogs.owner_id = auth.uid()
    )
  );

-- Add UPDATE policy for vaccine_certifications table (in case needed for status updates)
CREATE POLICY "Users can update vaccine certifications for their dogs"
  ON vaccine_certifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = vaccine_certifications.dog_id 
      AND dogs.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = vaccine_certifications.dog_id 
      AND dogs.owner_id = auth.uid()
    )
  );