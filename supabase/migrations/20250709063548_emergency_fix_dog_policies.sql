/*
  # Emergency Fix for Dog Registration RLS Policies
  
  This migration completely rebuilds the RLS policies for dogs and profiles tables
  to fix the 401 unauthorized errors and policy violations.
*/

-- First, disable RLS temporarily to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE dogs DISABLE ROW LEVEL SECURITY;
ALTER TABLE vaccine_certifications DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "プロフィールは本人のみ参照可能" ON profiles;
DROP POLICY IF EXISTS "プロフィールは本人のみ更新可能" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can upsert their own profile" ON profiles;

DROP POLICY IF EXISTS "犬情報は所有者のみ参照可能" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ更新可能" ON dogs;
DROP POLICY IF EXISTS "Users can insert their own dogs" ON dogs;
DROP POLICY IF EXISTS "Dogs: Users can view their own dogs" ON dogs;
DROP POLICY IF EXISTS "Dogs: Users can insert their own dogs" ON dogs;
DROP POLICY IF EXISTS "Dogs: Users can update their own dogs" ON dogs;
DROP POLICY IF EXISTS "Dogs: Users can delete their own dogs" ON dogs;

DROP POLICY IF EXISTS "Users can insert vaccine certifications for their dogs" ON vaccine_certifications;
DROP POLICY IF EXISTS "Users can update vaccine certifications for their dogs" ON vaccine_certifications;
DROP POLICY IF EXISTS "Vaccine Certs: Users can view their dogs' certifications" ON vaccine_certifications;
DROP POLICY IF EXISTS "Vaccine Certs: Users can insert certifications for their dogs" ON vaccine_certifications;
DROP POLICY IF EXISTS "Vaccine Certs: Users can update certifications for their dogs" ON vaccine_certifications;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccine_certifications ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies for profiles
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create simple, working policies for dogs
CREATE POLICY "dogs_select_own"
  ON dogs FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "dogs_insert_own"
  ON dogs FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "dogs_update_own"
  ON dogs FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "dogs_delete_own"
  ON dogs FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Create policies for vaccine_certifications
CREATE POLICY "vaccine_certs_select_own"
  ON vaccine_certifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = vaccine_certifications.dog_id 
      AND dogs.owner_id = auth.uid()
    )
  );

CREATE POLICY "vaccine_certs_insert_own"
  ON vaccine_certifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = vaccine_certifications.dog_id 
      AND dogs.owner_id = auth.uid()
    )
  );

CREATE POLICY "vaccine_certs_update_own"
  ON vaccine_certifications FOR UPDATE
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

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON dogs TO authenticated;
GRANT ALL ON vaccine_certifications TO authenticated;

-- Success message
SELECT 'RLS policies have been successfully rebuilt for all tables' as message;
