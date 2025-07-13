/*
  Add email column to profiles table for easier admin access
*/

-- Add email column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Create a unique index on email to prevent duplicates  
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON profiles(email) WHERE email IS NOT NULL;

-- Create a function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new user is created in auth.users, update the profiles table
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE profiles 
    SET email = NEW.email 
    WHERE id = NEW.id;
    
    -- If profile doesn't exist, create it
    IF NOT FOUND THEN
      INSERT INTO profiles (id, email, user_type, created_at)
      VALUES (NEW.id, NEW.email, 'user', NOW())
      ON CONFLICT (id) DO UPDATE SET email = NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync emails automatically
DROP TRIGGER IF EXISTS sync_profile_email_trigger ON auth.users;
CREATE TRIGGER sync_profile_email_trigger
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();

-- Manually sync existing emails from auth.users to profiles
-- This is done using a SECURITY DEFINER function to bypass RLS
CREATE OR REPLACE FUNCTION sync_existing_emails()
RETURNS void AS $$
BEGIN
  -- Update existing profiles with emails from auth.users
  UPDATE profiles 
  SET email = au.email
  FROM auth.users au
  WHERE profiles.id = au.id 
    AND au.email IS NOT NULL
    AND profiles.email IS NULL;
    
  RAISE NOTICE 'Email sync completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the sync function
SELECT sync_existing_emails();

-- Drop the sync function after use
DROP FUNCTION sync_existing_emails();

-- Add comment to explain the email column
COMMENT ON COLUMN profiles.email IS 'User email copied from auth.users for easier admin access'; 