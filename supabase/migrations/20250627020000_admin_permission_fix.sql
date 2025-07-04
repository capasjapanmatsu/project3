/*
  # Fix Admin Permission Check

  1. Changes
    - Update admin permission check to work with both capasjapan@gmail.com and user_type = 'admin'
    - Create a unified admin check function
    - Update all RLS policies and functions to use the new check
*/

-- 既存の関数を削除（型変更のため）
DROP FUNCTION IF EXISTS get_admin_stats();
DROP FUNCTION IF EXISTS check_is_admin();
DROP FUNCTION IF EXISTS grant_admin_permission(text);
DROP FUNCTION IF EXISTS revoke_admin_permission(uuid);
DROP FUNCTION IF EXISTS list_admin_users();
DROP FUNCTION IF EXISTS reorder_product_images(uuid, uuid[]);
DROP FUNCTION IF EXISTS delete_product_image(uuid);
DROP FUNCTION IF EXISTS set_main_product_image(uuid, uuid);

-- Create a unified admin check function
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is capasjapan@gmail.com OR has user_type = 'admin'
  RETURN (
    (auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
  );
END;
$$;

-- Update the check_is_admin function to use the new logic
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN is_admin_user();
END;
$$;

-- Update get_admin_stats function
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  current_month_start date := date_trunc('month', current_date)::date;
  last_month_start date := date_trunc('month', current_date - interval '1 month')::date;
  last_month_end date := date_trunc('month', current_date) - interval '1 day';
BEGIN
  -- Check if user is admin using new function
  IF NOT is_admin_user() THEN
    RETURN jsonb_build_object('error', 'Unauthorized access');
  END IF;

  -- Gather statistics
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_parks', (SELECT COUNT(*) FROM dog_parks),
    'pending_parks', (SELECT COUNT(*) FROM dog_parks WHERE status = 'pending'),
    'pending_vaccines', (SELECT COUNT(*) FROM vaccine_certifications WHERE status = 'pending'),
    'total_reservations', (SELECT COUNT(*) FROM reservations WHERE date >= current_month_start),
    'monthly_revenue', COALESCE((SELECT SUM(total_amount) FROM reservations WHERE date >= current_month_start), 0),
    'last_month_revenue', COALESCE((SELECT SUM(total_amount) FROM reservations WHERE date >= last_month_start AND date <= last_month_end), 0),
    'total_subscriptions', (SELECT COUNT(*) FROM subscriptions),
    'active_subscriptions', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND end_date >= current_date),
    'new_users_this_month', (SELECT COUNT(*) FROM profiles WHERE created_at >= current_month_start),
    'unread_messages', (SELECT COUNT(*) FROM contact_messages WHERE status = 'new')
  ) INTO result;

  RETURN result;
END;
$$;

-- Update grant_admin_permission function
CREATE OR REPLACE FUNCTION grant_admin_permission(admin_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Check if the current user is an admin using new function
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Only administrators can grant admin permissions';
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

-- Update revoke_admin_permission function
CREATE OR REPLACE FUNCTION revoke_admin_permission(admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_email text;
BEGIN
  -- Check if the current user is an admin using new function
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Only administrators can revoke admin permissions';
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

-- Update list_admin_users function
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
  -- Check if the current user is an admin using new function
  IF NOT is_admin_user() THEN
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

-- Update product image management functions
CREATE OR REPLACE FUNCTION reorder_product_images(product_id_param uuid, image_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  i integer;
BEGIN
  -- Check if the current user is an admin using new function
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  -- Update display_order for each image
  FOR i IN 1..array_length(image_ids, 1) LOOP
    UPDATE product_images
    SET display_order = i - 1
    WHERE id = image_ids[i]
    AND product_id = product_id_param;
  END LOOP;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION delete_product_image(image_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin using new function
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  -- Delete the image
  DELETE FROM product_images
  WHERE id = image_id_param;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION set_main_product_image(product_id_param uuid, image_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  image_url_val text;
BEGIN
  -- Check if the current user is an admin using new function
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  -- Get the image URL
  SELECT image_url INTO image_url_val
  FROM product_images
  WHERE id = image_id_param AND product_id = product_id_param;
  
  IF image_url_val IS NULL THEN
    RAISE EXCEPTION 'Image not found';
  END IF;
  
  -- Get the current main image URL
  DECLARE
    current_main_url text;
  BEGIN
    SELECT image_url INTO current_main_url
    FROM products
    WHERE id = product_id_param;
    
    -- If there's a current main image, add it to product_images
    IF current_main_url IS NOT NULL AND current_main_url != '' THEN
      INSERT INTO product_images (
        product_id,
        image_url,
        display_order
      )
      VALUES (
        product_id_param,
        current_main_url,
        (SELECT COALESCE(MAX(display_order), 0) + 1 FROM product_images WHERE product_id = product_id_param)
      );
    END IF;
  END;
  
  -- Update the product's main image
  UPDATE products
  SET image_url = image_url_val
  WHERE id = product_id_param;
  
  -- Delete the image from product_images
  DELETE FROM product_images
  WHERE id = image_id_param;
  
  RETURN true;
END;
$$;

-- Update RLS policies to use the new admin check
-- Drop existing admin policies and recreate them

-- Contact messages
DROP POLICY IF EXISTS "Only admins can access contact messages" ON contact_messages;
CREATE POLICY "Only admins can access contact messages"
  ON contact_messages
  USING (is_admin_user());

-- Admin notifications
DROP POLICY IF EXISTS "Only admins can access admin notifications" ON admin_notifications;
CREATE POLICY "Only admins can access admin notifications"
  ON admin_notifications
  USING (is_admin_user());

-- Product images
DROP POLICY IF EXISTS "Only admins can manage product images" ON product_images;
CREATE POLICY "Only admins can manage product images"
  ON product_images
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Notifications
DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON notifications;
CREATE POLICY "Admins can insert notifications for any user"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
CREATE POLICY "Admins can view all notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (is_admin_user());

-- Auth logs
DROP POLICY IF EXISTS "Admins can view all auth logs" ON auth_logs;
CREATE POLICY "Admins can view all auth logs"
  ON auth_logs
  FOR SELECT
  TO authenticated
  USING (is_admin_user());

-- Owner verifications
DROP POLICY IF EXISTS "Admins can view all verification data" ON owner_verifications;
CREATE POLICY "Admins can view all verification data"
  ON owner_verifications
  FOR SELECT
  TO authenticated
  USING (is_admin_user());

-- PayPay payments
DROP POLICY IF EXISTS "Admins can view all payments" ON paypay_payments;
CREATE POLICY "Admins can view all payments"
  ON paypay_payments
  FOR SELECT
  TO authenticated
  USING (is_admin_user());

-- Add comment to explain the new admin system
COMMENT ON FUNCTION is_admin_user() IS 'Unified admin check function that works with both capasjapan@gmail.com and user_type = admin'; 