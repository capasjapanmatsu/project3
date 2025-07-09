/*
  # Debug RLS Policies
  
  This migration adds debugging information and ensures RLS policies are working correctly
*/

-- Check current policies
DO $$
BEGIN
  -- Check profiles policies
  RAISE NOTICE 'Checking profiles table policies...';
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_own'
  ) THEN
    RAISE NOTICE '✓ profiles_select_own policy exists';
  ELSE
    RAISE NOTICE '✗ profiles_select_own policy missing';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert_own'
  ) THEN
    RAISE NOTICE '✓ profiles_insert_own policy exists';
  ELSE
    RAISE NOTICE '✗ profiles_insert_own policy missing';
  END IF;
  
  -- Check dogs policies  
  RAISE NOTICE 'Checking dogs table policies...';
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'dogs' AND policyname = 'dogs_select_own'
  ) THEN
    RAISE NOTICE '✓ dogs_select_own policy exists';
  ELSE
    RAISE NOTICE '✗ dogs_select_own policy missing';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'dogs' AND policyname = 'dogs_insert_own'
  ) THEN
    RAISE NOTICE '✓ dogs_insert_own policy exists';
  ELSE
    RAISE NOTICE '✗ dogs_insert_own policy missing';
  END IF;
  
  -- Check if RLS is enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✓ RLS enabled on profiles table';
  ELSE
    RAISE NOTICE '✗ RLS disabled on profiles table';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'dogs' AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✓ RLS enabled on dogs table';
  ELSE
    RAISE NOTICE '✗ RLS disabled on dogs table';
  END IF;
END $$;

-- Add a test function to debug authentication
CREATE OR REPLACE FUNCTION debug_auth_info()
RETURNS TABLE(
  current_user_id uuid,
  current_user_role text,
  current_user_email text,
  auth_uid uuid,
  is_authenticated boolean
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT 
    auth.uid() as current_user_id,
    current_user as current_user_role,
    auth.email() as current_user_email,
    auth.uid() as auth_uid,
    (auth.uid() IS NOT NULL) as is_authenticated;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_auth_info() TO authenticated;

-- Create a simple test for profiles insert
CREATE OR REPLACE FUNCTION test_profile_insert(test_user_id uuid, test_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result text;
BEGIN
  BEGIN
    INSERT INTO profiles (id, name, user_type, postal_code, address, phone_number)
    VALUES (test_user_id, test_name, 'user', '', '', '');
    result := 'SUCCESS: Profile inserted';
  EXCEPTION WHEN OTHERS THEN
    result := 'ERROR: ' || SQLERRM;
  END;
  
  RETURN result;
END;
$$;

-- Create a simple test for dogs insert
CREATE OR REPLACE FUNCTION test_dog_insert(test_owner_id uuid, test_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result text;
BEGIN
  BEGIN
    INSERT INTO dogs (name, breed, birth_date, gender, owner_id)
    VALUES (test_name, 'テスト犬種', '2020-01-01', 'オス', test_owner_id);
    result := 'SUCCESS: Dog inserted';
  EXCEPTION WHEN OTHERS THEN
    result := 'ERROR: ' || SQLERRM;
  END;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION test_profile_insert(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION test_dog_insert(uuid, text) TO authenticated;

-- Final success message
SELECT 'Debug functions created successfully' as message;
