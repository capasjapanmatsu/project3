/*
# Add system_alert notification type and 2FA helper functions

1. New Features
  - Add 'system_alert' to notification types
  - Create development helper functions for 2FA

2. Changes
  - Update notifications_type_check constraint to include 'system_alert'
  - Add functions to get and log 2FA codes for development purposes
*/

-- Update notifications type check constraint to include system_alert
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type = ANY (ARRAY[
    'friend_request'::text, 
    'friend_accepted'::text, 
    'friend_at_park'::text, 
    'reservation_reminder'::text, 
    'order_confirmed'::text, 
    'order_shipped'::text, 
    'order_delivered'::text, 
    'qr_shared'::text, 
    'qr_revoked'::text, 
    'vaccine_expiry_warning'::text, 
    'vaccine_expired'::text, 
    'vaccine_reapproval_required'::text, 
    'park_approval_required'::text, 
    'vaccine_approval_required'::text, 
    'blacklisted_dog_nearby'::text, 
    'subscription_paused'::text, 
    'subscription_resumed'::text,
    'system_alert'::text
  ]));

-- Create a function to get the latest 2FA code for a user (for development purposes only)
CREATE OR REPLACE FUNCTION get_latest_2fa_code(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_val text;
BEGIN
  -- Only allow this in development environment
  IF current_setting('app.environment', true) = 'production' THEN
    RETURN 'Not available in production';
  END IF;

  -- Get the latest code
  SELECT code INTO code_val
  FROM two_factor_codes
  WHERE user_id = user_id_param
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN code_val;
END;
$$;

-- Create a function to log 2FA code to notifications (for development purposes)
CREATE OR REPLACE FUNCTION log_2fa_code_to_notification(
  user_id_param uuid,
  code_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert notification with the code
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    read
  ) VALUES (
    user_id_param,
    'system_alert',
    '認証コードが生成されました',
    '認証コード: ' || code_param || '（開発環境用）',
    jsonb_build_object('code', code_param),
    false
  );
END;
$$;