/*
# User Entry Status System

1. New Tables
   - `user_entry_status` - Tracks which users are currently inside which dog parks

2. Security
   - Enable RLS on `user_entry_status` table
   - Add policy for authenticated users to view their own entry status

3. Functions
   - `record_user_entry` - Records when a user enters a park
   - `record_user_exit` - Records when a user exits a park
   - `generate_exit_qr` - Generates QR code data for exiting a park
   - `generate_entrance_qr` - Modified to check if user is already inside a park
   - `is_user_inside_park` - Checks if a user is currently inside a park
   - `cleanup_expired_qr_codes` - Cleans up expired QR codes
*/

-- Create user entry status table to track who is inside which park
CREATE TABLE IF NOT EXISTS user_entry_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  park_id uuid NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  entry_time timestamptz NOT NULL DEFAULT now(),
  dog_ids uuid[] NOT NULL,
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_entry_status_user_id ON user_entry_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entry_status_park_id ON user_entry_status(park_id);

-- Enable RLS on the table
ALTER TABLE user_entry_status ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists (to avoid errors)
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "Users can view their own entry status" ON user_entry_status;
  EXCEPTION WHEN OTHERS THEN
    -- Policy doesn't exist, ignore error
  END;
END $$;

-- Create policies for the table
CREATE POLICY "Users can view their own entry status"
  ON user_entry_status
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to record user entry
CREATE OR REPLACE FUNCTION record_user_entry(
  p_user_id uuid,
  p_park_id uuid,
  p_dog_ids uuid[]
) RETURNS boolean AS $$
DECLARE
  v_current_entry user_entry_status;
BEGIN
  -- Check if user is already inside a park
  SELECT * INTO v_current_entry FROM user_entry_status WHERE user_id = p_user_id;
  
  IF FOUND THEN
    -- User is already inside a park, update the record
    UPDATE user_entry_status
    SET park_id = p_park_id,
        entry_time = now(),
        dog_ids = p_dog_ids
    WHERE user_id = p_user_id;
  ELSE
    -- User is not inside any park, create a new record
    INSERT INTO user_entry_status (user_id, park_id, entry_time, dog_ids)
    VALUES (p_user_id, p_park_id, now(), p_dog_ids);
  END IF;
  
  -- Increment park occupancy
  UPDATE dog_parks
  SET current_occupancy = current_occupancy + 1
  WHERE id = p_park_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record user exit
CREATE OR REPLACE FUNCTION record_user_exit(
  p_user_id uuid,
  p_park_id uuid
) RETURNS boolean AS $$
DECLARE
  v_current_entry user_entry_status;
BEGIN
  -- Check if user is inside the specified park
  SELECT * INTO v_current_entry 
  FROM user_entry_status 
  WHERE user_id = p_user_id AND park_id = p_park_id;
  
  IF NOT FOUND THEN
    -- User is not inside this park
    RETURN false;
  END IF;
  
  -- Delete the entry record
  DELETE FROM user_entry_status WHERE user_id = p_user_id;
  
  -- Decrement park occupancy (ensure it doesn't go below 0)
  UPDATE dog_parks
  SET current_occupancy = GREATEST(0, current_occupancy - 1)
  WHERE id = p_park_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate exit QR code
CREATE OR REPLACE FUNCTION generate_exit_qr(
  p_user_id uuid,
  p_park_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_current_entry user_entry_status;
  v_expires_at timestamptz;
  v_access_code text;
BEGIN
  -- Check if user is inside the specified park
  SELECT * INTO v_current_entry 
  FROM user_entry_status 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not currently inside any park';
  END IF;
  
  -- Generate expiration time (5 minutes from now)
  v_expires_at := now() + interval '5 minutes';
  
  -- Generate random access code
  v_access_code := encode(gen_random_bytes(8), 'hex');
  
  -- Return QR data
  RETURN jsonb_build_object(
    'type', 'exit',
    'user_id', p_user_id,
    'park_id', v_current_entry.park_id,
    'dog_ids', v_current_entry.dog_ids,
    'entry_time', v_current_entry.entry_time,
    'access_code', v_access_code,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify the existing generate_entrance_qr function to handle entry status
CREATE OR REPLACE FUNCTION generate_entrance_qr(
  p_user_id uuid,
  p_dog_ids uuid[],
  p_payment_type text,
  p_total_amount integer
) RETURNS jsonb AS $$
DECLARE
  v_expires_at timestamptz;
  v_access_code text;
  v_current_entry user_entry_status;
BEGIN
  -- Check if user is already inside a park
  SELECT * INTO v_current_entry FROM user_entry_status WHERE user_id = p_user_id;
  
  IF FOUND THEN
    RAISE EXCEPTION 'User is already inside a park. Please exit first.';
  END IF;

  -- Generate expiration time (5 minutes from now)
  v_expires_at := now() + interval '5 minutes';
  
  -- Generate random access code
  v_access_code := encode(gen_random_bytes(8), 'hex');
  
  -- Create temporary QR code records for each dog
  INSERT INTO entrance_qr_codes_temp (
    user_id,
    dog_ids,
    access_code,
    payment_type,
    total_amount,
    expires_at,
    status
  ) VALUES (
    p_user_id,
    p_dog_ids,
    v_access_code,
    p_payment_type,
    p_total_amount,
    v_expires_at,
    'active'
  );
  
  -- Return QR data
  RETURN jsonb_build_object(
    'type', 'entry',
    'user_id', p_user_id,
    'dog_ids', p_dog_ids,
    'access_code', v_access_code,
    'payment_type', p_payment_type,
    'total_amount', p_total_amount,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is currently inside a park
CREATE OR REPLACE FUNCTION is_user_inside_park(
  p_user_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_entry user_entry_status;
  v_park dog_parks;
  v_entry_time timestamptz;
  v_duration interval;
BEGIN
  -- Check if user is inside a park
  SELECT * INTO v_entry FROM user_entry_status WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_inside', false
    );
  END IF;
  
  -- Get park details
  SELECT * INTO v_park FROM dog_parks WHERE id = v_entry.park_id;
  
  -- Calculate duration
  v_entry_time := v_entry.entry_time;
  v_duration := now() - v_entry_time;
  
  -- Return entry status
  RETURN jsonb_build_object(
    'is_inside', true,
    'park_id', v_entry.park_id,
    'park_name', v_park.name,
    'entry_time', v_entry_time,
    'duration', v_duration,
    'dog_ids', v_entry.dog_ids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to handle automatic cleanup of expired QR codes
CREATE OR REPLACE FUNCTION cleanup_expired_qr_codes() RETURNS trigger AS $$
BEGIN
  -- Mark expired QR codes as 'expired'
  UPDATE entrance_qr_codes_temp
  SET status = 'expired'
  WHERE expires_at < now() AND status = 'active';
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run the cleanup function periodically
DROP TRIGGER IF EXISTS cleanup_expired_qr_codes_trigger ON entrance_qr_codes_temp;
CREATE TRIGGER cleanup_expired_qr_codes_trigger
AFTER INSERT ON entrance_qr_codes_temp
EXECUTE FUNCTION cleanup_expired_qr_codes();