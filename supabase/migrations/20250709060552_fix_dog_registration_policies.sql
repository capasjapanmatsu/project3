/*
  # Fix Dog Registration Policies

  1. Issues Fixed:
    - Add missing INSERT policy for profiles table 
    - Fix dogs table RLS policies to properly handle authentication
    - Ensure proper authentication flow for dog registration

  2. Security Updates:
    - Allow authenticated users to create their own profile
    - Allow authenticated users to insert dogs with proper owner_id validation
    - Maintain data integrity and security
*/

-- First, let's fix the profiles table policies
-- Add INSERT policy for profiles table (missing in original schema)
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Make sure profiles table has proper UPSERT support
-- This is needed for the dog registration flow
CREATE POLICY "Users can upsert their own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Drop and recreate dogs table policies to ensure they work properly
DROP POLICY IF EXISTS "犬情報は所有者のみ参照可能" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ更新可能" ON dogs;
DROP POLICY IF EXISTS "Users can insert their own dogs" ON dogs;

-- Create comprehensive policies for dogs table
CREATE POLICY "Dogs: Users can view their own dogs"
  ON dogs
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Dogs: Users can insert their own dogs"
  ON dogs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Dogs: Users can update their own dogs"
  ON dogs
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Dogs: Users can delete their own dogs"
  ON dogs
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Also fix vaccine_certifications policies to be more robust
DROP POLICY IF EXISTS "Users can insert vaccine certifications for their dogs" ON vaccine_certifications;
DROP POLICY IF EXISTS "Users can update vaccine certifications for their dogs" ON vaccine_certifications;

-- Recreate vaccine_certifications policies
CREATE POLICY "Vaccine Certs: Users can view their dogs' certifications"
  ON vaccine_certifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = vaccine_certifications.dog_id 
      AND dogs.owner_id = auth.uid()
    )
  );

CREATE POLICY "Vaccine Certs: Users can insert certifications for their dogs"
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

CREATE POLICY "Vaccine Certs: Users can update certifications for their dogs"
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

-- Add any missing columns that might be needed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for dogs table
DROP TRIGGER IF EXISTS update_dogs_updated_at ON dogs;
CREATE TRIGGER update_dogs_updated_at
    BEFORE UPDATE ON dogs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
