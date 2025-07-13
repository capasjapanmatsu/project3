/*
  Add Admin User Management Function
  This migration creates a secure function for admins to access user email data
*/

-- Create a function to get user data with emails for admin use
CREATE OR REPLACE FUNCTION get_admin_user_data()
RETURNS TABLE (
  id uuid,
  email text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT (
    (auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Only administrators can access user data';
  END IF;
  
  -- Return user data from auth.users
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    u.created_at,
    u.last_sign_in_at,
    u.deleted_at
  FROM auth.users u
  WHERE u.deleted_at IS NULL
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_user_data() TO authenticated;

-- Add comment to explain the function
COMMENT ON FUNCTION get_admin_user_data() IS 'Secure function for admin users to retrieve user email data from auth.users table'; 