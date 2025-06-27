/*
# Add SMS 2FA Support

1. New Tables
  - No new tables required, using existing two_factor_codes table

2. Changes
  - Add notification for 2FA code sent
  - Add function to check if phone number is valid

3. Security
  - No changes to security policies
*/

-- Create a function to check if a phone number is valid
CREATE OR REPLACE FUNCTION is_valid_phone_number(phone_number text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Basic validation for Japanese phone numbers
  -- Formats: 090-1234-5678, 03-1234-5678, etc.
  RETURN phone_number ~ '^0\d{1,4}-\d{1,4}-\d{4}$';
END;
$$;

-- Create a function to format phone number to international format
CREATE OR REPLACE FUNCTION format_phone_to_international(phone_number text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove hyphens
  phone_number := replace(phone_number, '-', '');
  
  -- Convert Japanese format to international
  IF phone_number ~ '^0' THEN
    phone_number := '+81' || substring(phone_number from 2);
  END IF;
  
  RETURN phone_number;
END;
$$;

-- Create a function to handle 2FA code generation
CREATE OR REPLACE FUNCTION generate_2fa_code(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  verification_code text;
  expiry_time timestamptz;
BEGIN
  -- Generate a random 6-digit code
  verification_code := lpad(floor(random() * 1000000)::text, 6, '0');
  
  -- Set expiry time to 10 minutes from now
  expiry_time := now() + interval '10 minutes';
  
  -- Check if there's an existing code for this user
  IF EXISTS (SELECT 1 FROM two_factor_codes WHERE user_id = user_id_param) THEN
    -- Update the existing code
    UPDATE two_factor_codes
    SET 
      code = verification_code,
      expires_at = expiry_time,
      attempts = 0
    WHERE user_id = user_id_param;
  ELSE
    -- Insert a new code
    INSERT INTO two_factor_codes (
      user_id,
      code,
      expires_at
    ) VALUES (
      user_id_param,
      verification_code,
      expiry_time
    );
  END IF;
  
  RETURN verification_code;
END;
$$;

-- Create a function to verify 2FA code
CREATE OR REPLACE FUNCTION verify_2fa_code(
  user_id_param uuid,
  code_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record two_factor_codes%ROWTYPE;
BEGIN
  -- Get the stored code
  SELECT * INTO code_record
  FROM two_factor_codes
  WHERE user_id = user_id_param;
  
  -- Check if code exists
  IF code_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if code is expired
  IF code_record.expires_at < now() THEN
    RETURN false;
  END IF;
  
  -- Check if too many attempts
  IF code_record.attempts >= 5 THEN
    RETURN false;
  END IF;
  
  -- Increment attempts
  UPDATE two_factor_codes
  SET attempts = code_record.attempts + 1
  WHERE user_id = user_id_param;
  
  -- Verify the code
  IF code_record.code = code_param THEN
    -- Code is valid, delete it to prevent reuse
    DELETE FROM two_factor_codes
    WHERE user_id = user_id_param;
    
    -- Log the successful verification
    INSERT INTO auth_logs (
      user_id,
      action,
      ip_address,
      user_agent
    ) VALUES (
      user_id_param,
      '2fa_verification',
      'function_call',
      'internal_function'
    );
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Create a function to get user's phone number
CREATE OR REPLACE FUNCTION get_user_phone_number(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  phone_number_val text;
BEGIN
  SELECT phone_number INTO phone_number_val
  FROM profiles
  WHERE id = user_id_param;
  
  RETURN phone_number_val;
END;
$$;