/*
  # Two-Factor Authentication Schema

  1. New Tables
    - `two_factor_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `code` (text, the verification code)
      - `expires_at` (timestamptz, when the code expires)
      - `attempts` (integer, number of verification attempts)
      - `created_at` (timestamptz)
    
    - `trusted_devices`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `token` (text, unique device token)
      - `device_info` (text, user agent or device identifier)
      - `last_used_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `auth_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `action` (text, the auth action performed)
      - `ip_address` (text)
      - `user_agent` (text)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
*/

-- Create two_factor_codes table
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create trusted_devices table
CREATE TABLE IF NOT EXISTS trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_info text,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create auth_logs table
CREATE TABLE IF NOT EXISTS auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS two_factor_codes_user_id_idx ON two_factor_codes(user_id);
CREATE INDEX IF NOT EXISTS trusted_devices_user_id_idx ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS trusted_devices_token_idx ON trusted_devices(token);
CREATE INDEX IF NOT EXISTS auth_logs_user_id_idx ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS auth_logs_created_at_idx ON auth_logs(created_at);

-- Enable row level security
ALTER TABLE two_factor_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for two_factor_codes
CREATE POLICY "Users can manage their own 2FA codes"
  ON two_factor_codes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for trusted_devices
CREATE POLICY "Users can manage their own trusted devices"
  ON trusted_devices
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for auth_logs
CREATE POLICY "Users can view their own auth logs"
  ON auth_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for admins to view all auth logs
CREATE POLICY "Admins can view all auth logs"
  ON auth_logs
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'capasjapan@gmail.com');

-- Function to clean up expired 2FA codes
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM two_factor_codes
  WHERE expires_at < now();
END;
$$;

-- Function to clean up expired trusted devices
CREATE OR REPLACE FUNCTION cleanup_expired_trusted_devices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM trusted_devices
  WHERE expires_at < now();
END;
$$;

-- Function to verify if a device is trusted
CREATE OR REPLACE FUNCTION is_device_trusted(user_id_param uuid, token_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_trusted boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM trusted_devices
    WHERE user_id = user_id_param
    AND token = token_param
    AND expires_at > now()
  ) INTO is_trusted;
  
  -- Update last_used_at if device is trusted
  IF is_trusted THEN
    UPDATE trusted_devices
    SET last_used_at = now()
    WHERE user_id = user_id_param
    AND token = token_param;
  END IF;
  
  RETURN is_trusted;
END;
$$;

-- Function to log authentication events
CREATE OR REPLACE FUNCTION log_auth_event(
  user_id_param uuid,
  action_param text,
  ip_address_param text,
  user_agent_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO auth_logs (
    user_id,
    action,
    ip_address,
    user_agent
  ) VALUES (
    user_id_param,
    action_param,
    ip_address_param,
    user_agent_param
  );
END;
$$;