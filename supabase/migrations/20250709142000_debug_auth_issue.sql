/*
  # Debug Authentication and RLS Issue
  
  This migration creates debugging functions to understand why
  dog registration is still failing with RLS violations.
*/

-- Create a comprehensive debug function
CREATE OR REPLACE FUNCTION debug_auth_and_rls()
RETURNS TABLE (
  debug_type text,
  debug_info jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check current auth state
  RETURN QUERY
  SELECT 
    'auth_uid'::text,
    jsonb_build_object(
      'current_user_id', auth.uid(),
      'current_role', current_user,
      'session_exists', (auth.uid() IS NOT NULL)
    );

  -- Check policies
  RETURN QUERY
  SELECT 
    'policies'::text,
    jsonb_agg(
      jsonb_build_object(
        'table', tablename,
        'policy', policyname,
        'command', cmd,
        'roles', roles,
        'qual', qual,
        'with_check', with_check
      )
    )
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'dogs');

  -- Check table permissions
  RETURN QUERY
  SELECT 
    'table_grants'::text,
    jsonb_agg(
      jsonb_build_object(
        'table', table_name,
        'grantee', grantee,
        'privilege', privilege_type
      )
    )
  FROM information_schema.role_table_grants 
  WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'dogs')
  AND grantee = 'authenticated';

  -- Check RLS status
  RETURN QUERY
  SELECT 
    'rls_status'::text,
    jsonb_agg(
      jsonb_build_object(
        'table', schemaname || '.' || tablename,
        'rls_enabled', rowsecurity
      )
    )
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'dogs');

END;
$$;

-- Create a function to test dog insertion with detailed logging
CREATE OR REPLACE FUNCTION test_dog_insert_detailed(
  test_name text DEFAULT 'Test Dog',
  test_breed text DEFAULT 'Test Breed',
  test_birth_date date DEFAULT '2020-01-01',
  test_gender text DEFAULT 'オス'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  profile_exists boolean;
  insert_result jsonb;
  error_info jsonb;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = current_user_id) INTO profile_exists;
  
  -- Try to insert a test dog
  BEGIN
    INSERT INTO dogs (name, breed, birth_date, gender, owner_id)
    VALUES (test_name, test_breed, test_birth_date, test_gender, current_user_id);
    
    insert_result := jsonb_build_object(
      'success', true,
      'message', 'Dog inserted successfully'
    );
  EXCEPTION WHEN OTHERS THEN
    insert_result := jsonb_build_object(
      'success', false,
      'error_code', SQLSTATE,
      'error_message', SQLERRM,
      'error_detail', 'INSERT failed with RLS violation'
    );
  END;
  
  -- Return comprehensive test results
  RETURN jsonb_build_object(
    'test_timestamp', now(),
    'current_user_id', current_user_id,
    'profile_exists', profile_exists,
    'test_parameters', jsonb_build_object(
      'name', test_name,
      'breed', test_breed,
      'birth_date', test_birth_date,
      'gender', test_gender,
      'owner_id', current_user_id
    ),
    'insert_result', insert_result
  );
END;
$$;

-- Create a function to check if policies would allow operation
CREATE OR REPLACE FUNCTION check_policy_conditions(test_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  
  result := jsonb_build_object(
    'current_user_id', current_user_id,
    'test_owner_id', test_owner_id,
    'ids_match', (current_user_id = test_owner_id),
    'current_user_null', (current_user_id IS NULL),
    'test_owner_null', (test_owner_id IS NULL),
    'both_not_null', (current_user_id IS NOT NULL AND test_owner_id IS NOT NULL)
  );
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION debug_auth_and_rls() TO authenticated;
GRANT EXECUTE ON FUNCTION test_dog_insert_detailed(text, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_policy_conditions(uuid) TO authenticated;

-- Success message
SELECT 'Debug functions created - ready to investigate RLS issue' as message; 