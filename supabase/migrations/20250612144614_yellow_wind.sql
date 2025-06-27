-- Add admin permissions management

-- Create a function to grant admin permissions to a user by email
CREATE OR REPLACE FUNCTION grant_admin_permission(admin_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Check if the current user is an admin
  IF NOT (SELECT (jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text) THEN
    RAISE EXCEPTION 'Only the main administrator can grant admin permissions';
  END IF;
  
  -- Find the user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
  
  -- Update the user's profile to set user_type to 'admin'
  UPDATE profiles
  SET user_type = 'admin'
  WHERE id = target_user_id;
  
  -- Create a notification for the new admin
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    target_user_id,
    'admin_permission',
    '管理者権限が付与されました',
    '管理者権限が付与されました。管理者ページにアクセスできるようになりました。',
    jsonb_build_object('granted_by', (SELECT email FROM auth.users WHERE id = auth.uid()))
  );
  
  RETURN true;
END;
$$;

-- Create a function to revoke admin permissions from a user
CREATE OR REPLACE FUNCTION revoke_admin_permission(admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_email text;
BEGIN
  -- Check if the current user is an admin
  IF NOT (SELECT (jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text) THEN
    RAISE EXCEPTION 'Only the main administrator can revoke admin permissions';
  END IF;
  
  -- Get the admin's email
  SELECT email INTO admin_email
  FROM auth.users
  WHERE id = admin_id;
  
  -- Don't allow revoking the main admin's permissions
  IF admin_email = 'capasjapan@gmail.com' THEN
    RAISE EXCEPTION 'Cannot revoke permissions from the main administrator';
  END IF;
  
  -- Update the user's profile to set user_type to 'user'
  UPDATE profiles
  SET user_type = 'user'
  WHERE id = admin_id;
  
  -- Create a notification for the user
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    admin_id,
    'admin_permission',
    '管理者権限が削除されました',
    '管理者権限が削除されました。管理者ページにアクセスできなくなりました。',
    jsonb_build_object('revoked_by', (SELECT email FROM auth.users WHERE id = auth.uid()))
  );
  
  RETURN true;
END;
$$;

-- Create a function to list all admin users
CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT (SELECT (jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text) THEN
    RAISE EXCEPTION 'Only administrators can list admin users';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    u.email,
    p.created_at
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.user_type = 'admin'
  ORDER BY p.created_at DESC;
END;
$$;

-- Create a view for admin users
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
  p.id,
  p.name,
  u.email,
  p.created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.user_type = 'admin'
ORDER BY p.created_at DESC;

-- Add RLS policy for the view
ALTER VIEW admin_users_view OWNER TO postgres;
GRANT SELECT ON admin_users_view TO postgres;
GRANT SELECT ON admin_users_view TO anon;
GRANT SELECT ON admin_users_view TO authenticated;
GRANT SELECT ON admin_users_view TO service_role;

-- Create a policy to allow only admins to view the admin users
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT (jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text);
END;
$$;