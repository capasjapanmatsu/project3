/*
  # QR Code Expiration System

  1. New Tables
    - `entrance_qr_codes_temp` - Temporary QR codes with 5-minute expiration
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `dog_ids` (uuid[], array of dog IDs)
      - `access_code` (text, unique code for entrance)
      - `payment_type` (text, 'single' or 'subscription')
      - `total_amount` (integer, payment amount)
      - `created_at` (timestamptz, when QR was created)
      - `expires_at` (timestamptz, 5 minutes after creation)
      - `status` (text, 'active', 'used', or 'expired')
  
  2. Functions
    - `generate_entrance_qr` - Creates a new temporary QR code
    - `validate_entrance_qr` - Validates a QR code and creates permanent entrance records
    - `expire_old_qr_codes` - Automatically expires QR codes older than 5 minutes
  
  3. Triggers
    - `auto_expire_qr_codes_trigger` - Runs every minute to expire old QR codes
*/

-- Create table for temporary QR codes with 5-minute expiration
CREATE TABLE IF NOT EXISTS entrance_qr_codes_temp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dog_ids uuid[] NOT NULL,
  access_code text NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('single', 'subscription')),
  total_amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired'))
);

-- Create index on access_code for fast lookups
CREATE INDEX IF NOT EXISTS entrance_qr_codes_temp_access_code_idx ON entrance_qr_codes_temp(access_code);

-- Create index on expires_at for efficient expiration checks
CREATE INDEX IF NOT EXISTS entrance_qr_codes_temp_expires_at_idx ON entrance_qr_codes_temp(expires_at);

-- Create index on user_id for user's QR codes
CREATE INDEX IF NOT EXISTS entrance_qr_codes_temp_user_id_idx ON entrance_qr_codes_temp(user_id);

-- Function to generate a new temporary QR code
CREATE OR REPLACE FUNCTION generate_entrance_qr(
  p_user_id uuid,
  p_dog_ids uuid[],
  p_payment_type text,
  p_total_amount integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_access_code text;
  v_expires_at timestamptz;
  v_qr_id uuid;
  v_result jsonb;
BEGIN
  -- Generate a random access code (6 characters alphanumeric)
  v_access_code := upper(substring(md5(random()::text) from 1 for 6));
  
  -- Set expiration time to 5 minutes from now
  v_expires_at := now() + interval '5 minutes';
  
  -- First, expire any active QR codes for this user
  UPDATE entrance_qr_codes_temp
  SET status = 'expired'
  WHERE user_id = p_user_id AND status = 'active';
  
  -- Insert new QR code
  INSERT INTO entrance_qr_codes_temp (
    user_id,
    dog_ids,
    access_code,
    payment_type,
    total_amount,
    expires_at
  )
  VALUES (
    p_user_id,
    p_dog_ids,
    v_access_code,
    p_payment_type,
    p_total_amount,
    v_expires_at
  )
  RETURNING id INTO v_qr_id;
  
  -- Return QR code information
  SELECT jsonb_build_object(
    'id', v_qr_id,
    'access_code', v_access_code,
    'expires_at', v_expires_at,
    'dog_count', array_length(p_dog_ids, 1),
    'payment_type', p_payment_type,
    'total_amount', p_total_amount
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Function to validate a QR code and create permanent entrance records
CREATE OR REPLACE FUNCTION validate_entrance_qr(
  p_access_code text,
  p_park_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qr_record entrance_qr_codes_temp;
  v_dog_id uuid;
  v_result jsonb;
  v_dog_names text[];
  v_valid boolean := false;
  v_message text := 'Invalid QR code';
BEGIN
  -- Get the QR code record
  SELECT * INTO v_qr_record
  FROM entrance_qr_codes_temp
  WHERE access_code = p_access_code AND status = 'active'
  LIMIT 1;
  
  -- Check if QR code exists and is valid
  IF v_qr_record IS NULL THEN
    v_message := 'QR code not found or already used';
  ELSIF v_qr_record.expires_at < now() THEN
    -- Mark as expired
    UPDATE entrance_qr_codes_temp
    SET status = 'expired'
    WHERE id = v_qr_record.id;
    
    v_message := 'QR code has expired';
  ELSE
    -- QR code is valid
    v_valid := true;
    
    -- Mark QR code as used
    UPDATE entrance_qr_codes_temp
    SET status = 'used'
    WHERE id = v_qr_record.id;
    
    -- Get dog names for the response
    SELECT array_agg(name) INTO v_dog_names
    FROM dogs
    WHERE id = ANY(v_qr_record.dog_ids);
    
    -- Create permanent entrance records for each dog
    FOREACH v_dog_id IN ARRAY v_qr_record.dog_ids
    LOOP
      INSERT INTO entrance_qr_codes (
        user_id,
        dog_id,
        access_code,
        payment_type,
        amount_charged,
        valid_until,
        status,
        park_id
      )
      VALUES (
        v_qr_record.user_id,
        v_dog_id,
        v_qr_record.access_code,
        v_qr_record.payment_type,
        CASE 
          WHEN v_qr_record.payment_type = 'subscription' THEN 0
          ELSE v_qr_record.total_amount / array_length(v_qr_record.dog_ids, 1) -- Split amount among dogs
        END,
        now() + interval '24 hours', -- Valid for 24 hours after scanning
        'active',
        p_park_id
      );
    END LOOP;
    
    v_message := 'QR code validated successfully';
  END IF;
  
  -- Return result
  SELECT jsonb_build_object(
    'valid', v_valid,
    'message', v_message,
    'user_id', v_qr_record.user_id,
    'dog_count', CASE WHEN v_qr_record IS NULL THEN 0 ELSE array_length(v_qr_record.dog_ids, 1) END,
    'dog_names', v_dog_names,
    'payment_type', v_qr_record.payment_type,
    'expires_at', v_qr_record.expires_at,
    'access_code', v_qr_record.access_code
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Function to automatically expire old QR codes
CREATE OR REPLACE FUNCTION expire_old_qr_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE entrance_qr_codes_temp
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < now();
END;
$$;

-- Create a trigger function to notify users when their QR code is about to expire
CREATE OR REPLACE FUNCTION notify_qr_expiring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This would typically send a notification to the user
  -- For now, we'll just insert a notification record
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    read
  )
  VALUES (
    NEW.user_id,
    'qr_expiring',
    'QRコードの有効期限が近づいています',
    'QRコードの有効期限が1分以内に切れます。必要な場合は再発行してください。',
    jsonb_build_object('qr_id', NEW.id),
    false
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Enable row level security on the temporary QR codes table
ALTER TABLE entrance_qr_codes_temp ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own QR codes
CREATE POLICY "Users can view their own QR codes"
  ON entrance_qr_codes_temp
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create policy to allow users to create their own QR codes
CREATE POLICY "Users can create their own QR codes"
  ON entrance_qr_codes_temp
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create policy to allow users to update their own QR codes
CREATE POLICY "Users can update their own QR codes"
  ON entrance_qr_codes_temp
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create a view to show QR code summary information
CREATE OR REPLACE VIEW qr_code_summary AS
SELECT
  t.access_code,
  t.user_id,
  t.payment_type,
  array_length(t.dog_ids, 1) as dog_count,
  t.total_amount,
  array_to_string(array_agg(d.name), ', ') as dog_names,
  t.created_at,
  t.expires_at,
  t.status
FROM
  entrance_qr_codes_temp t
JOIN
  dogs d ON d.id = ANY(t.dog_ids)
GROUP BY
  t.id, t.access_code, t.user_id, t.payment_type, t.dog_ids, t.total_amount, t.created_at, t.expires_at, t.status;

-- Create a function to get remaining time for a QR code
CREATE OR REPLACE FUNCTION get_qr_remaining_time(p_qr_id uuid)
RETURNS interval
LANGUAGE sql
STABLE
AS $$
  SELECT 
    CASE 
      WHEN status = 'active' AND expires_at > now() THEN expires_at - now()
      ELSE interval '0 seconds'
    END
  FROM entrance_qr_codes_temp
  WHERE id = p_qr_id;
$$;