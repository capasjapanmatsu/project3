-- Add new fields to smart_locks table
ALTER TABLE smart_locks ADD COLUMN IF NOT EXISTS pin_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE smart_locks ADD COLUMN IF NOT EXISTS current_pin_hash TEXT;
ALTER TABLE smart_locks ADD COLUMN IF NOT EXISTS sciener_lock_id TEXT;
ALTER TABLE smart_locks ADD COLUMN IF NOT EXISTS pin_last_updated TIMESTAMP WITH TIME ZONE;

-- Create table for temporary PIN codes
CREATE TABLE IF NOT EXISTS smart_lock_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_id TEXT NOT NULL REFERENCES smart_locks(lock_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pin_code TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('entry', 'exit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE
);

-- Add RLS to smart_lock_pins
ALTER TABLE smart_lock_pins ENABLE ROW LEVEL SECURITY;

-- Create policies for smart_lock_pins (check if they exist first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'smart_lock_pins' AND policyname = 'Users can view their own PINs'
  ) THEN
    CREATE POLICY "Users can view their own PINs" 
      ON smart_lock_pins
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'smart_lock_pins' AND policyname = 'Users can create their own PINs'
  ) THEN
    CREATE POLICY "Users can create their own PINs" 
      ON smart_lock_pins
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

-- Add exit_time and is_inside to user_entry_status
ALTER TABLE user_entry_status ADD COLUMN IF NOT EXISTS exit_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_entry_status ADD COLUMN IF NOT EXISTS is_inside BOOLEAN DEFAULT TRUE;

-- Create table for entry/exit logs
CREATE TABLE IF NOT EXISTS user_entry_exit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  park_id UUID NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  dog_ids UUID[] NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('entry', 'exit')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pin_code TEXT,
  lock_id TEXT REFERENCES smart_locks(lock_id) ON DELETE SET NULL
);

-- Add RLS to user_entry_exit_logs
ALTER TABLE user_entry_exit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user_entry_exit_logs (check if they exist first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_entry_exit_logs' AND policyname = 'Users can view their own logs'
  ) THEN
    CREATE POLICY "Users can view their own logs" 
      ON user_entry_exit_logs
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_entry_exit_logs' AND policyname = 'Park owners can view logs for their parks'
  ) THEN
    CREATE POLICY "Park owners can view logs for their parks" 
      ON user_entry_exit_logs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM dog_parks
          WHERE dog_parks.id = user_entry_exit_logs.park_id
          AND dog_parks.owner_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Function to generate a random PIN code
CREATE OR REPLACE FUNCTION generate_random_pin(length INT DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := '0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new PIN for a user and lock
CREATE OR REPLACE FUNCTION create_pin_for_lock(
  p_lock_id TEXT,
  p_user_id UUID,
  p_purpose TEXT DEFAULT 'entry',
  p_expiry_minutes INT DEFAULT 5
)
RETURNS TEXT AS $$
DECLARE
  v_pin TEXT;
  v_pin_hash TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate a random 6-digit PIN
  v_pin := generate_random_pin(6);
  
  -- Hash the PIN (in a real implementation, use a proper hashing function)
  v_pin_hash := encode(digest(v_pin, 'sha256'), 'hex');
  
  -- Set expiry time
  v_expires_at := now() + (p_expiry_minutes * interval '1 minute');
  
  -- Insert the PIN into the database
  INSERT INTO smart_lock_pins (
    lock_id,
    user_id,
    pin_code,
    pin_hash,
    purpose,
    expires_at
  ) VALUES (
    p_lock_id,
    p_user_id,
    v_pin,
    v_pin_hash,
    p_purpose,
    v_expires_at
  );
  
  -- Return the PIN
  RETURN v_pin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify a PIN
CREATE OR REPLACE FUNCTION verify_pin(
  p_lock_id TEXT,
  p_pin TEXT,
  p_purpose TEXT DEFAULT 'entry'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_pin_record RECORD;
  v_pin_hash TEXT;
  v_user_id UUID;
  v_park_id UUID;
  v_dog_ids UUID[];
BEGIN
  -- Hash the PIN
  v_pin_hash := encode(digest(p_pin, 'sha256'), 'hex');
  
  -- Find the PIN record
  SELECT * INTO v_pin_record
  FROM smart_lock_pins
  WHERE lock_id = p_lock_id
    AND pin_hash = v_pin_hash
    AND purpose = p_purpose
    AND expires_at > now()
    AND is_used = FALSE;
  
  -- If no record found, return false
  IF v_pin_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Mark the PIN as used
  UPDATE smart_lock_pins
  SET is_used = TRUE,
      used_at = now()
  WHERE id = v_pin_record.id;
  
  -- Get the user ID
  v_user_id := v_pin_record.user_id;
  
  -- Get the park ID for this lock
  SELECT park_id INTO v_park_id
  FROM smart_locks
  WHERE lock_id = p_lock_id;
  
  -- If entry
  IF p_purpose = 'entry' THEN
    -- Get the dog IDs for this user
    SELECT dog_ids INTO v_dog_ids
    FROM entrance_qr_codes_temp
    WHERE user_id = v_user_id
      AND status = 'active'
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no active QR code, use the user's dogs
    IF v_dog_ids IS NULL THEN
      SELECT array_agg(id) INTO v_dog_ids
      FROM dogs
      WHERE owner_id = v_user_id
      LIMIT 3;
    END IF;
    
    -- Log the entry
    INSERT INTO user_entry_exit_logs (
      user_id,
      park_id,
      dog_ids,
      action,
      pin_code,
      lock_id
    ) VALUES (
      v_user_id,
      v_park_id,
      v_dog_ids,
      'entry',
      p_pin,
      p_lock_id
    );
    
    -- Update or insert user entry status
    INSERT INTO user_entry_status (
      user_id,
      park_id,
      entry_time,
      dog_ids,
      is_inside
    ) VALUES (
      v_user_id,
      v_park_id,
      now(),
      v_dog_ids,
      TRUE
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      park_id = v_park_id,
      entry_time = now(),
      dog_ids = v_dog_ids,
      exit_time = NULL,
      is_inside = TRUE;
    
    -- Update park occupancy
    UPDATE dog_parks
    SET current_occupancy = current_occupancy + 1
    WHERE id = v_park_id
    AND current_occupancy < max_capacity;
    
  -- If exit
  ELSIF p_purpose = 'exit' THEN
    -- Get the user's current entry status
    SELECT dog_ids INTO v_dog_ids
    FROM user_entry_status
    WHERE user_id = v_user_id
    AND is_inside = TRUE;
    
    -- Log the exit
    INSERT INTO user_entry_exit_logs (
      user_id,
      park_id,
      dog_ids,
      action,
      pin_code,
      lock_id
    ) VALUES (
      v_user_id,
      v_park_id,
      v_dog_ids,
      'exit',
      p_pin,
      p_lock_id
    );
    
    -- Update user entry status
    UPDATE user_entry_status
    SET exit_time = now(),
        is_inside = FALSE
    WHERE user_id = v_user_id;
    
    -- Update park occupancy
    UPDATE dog_parks
    SET current_occupancy = GREATEST(0, current_occupancy - 1)
    WHERE id = v_park_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing function first to avoid the return type error
DROP FUNCTION IF EXISTS check_user_park_access(UUID, TEXT);

-- Function to check if a user has access to a park
CREATE OR REPLACE FUNCTION check_user_park_access(
  p_user_id UUID,
  p_lock_id TEXT
)
RETURNS TABLE (has_access BOOLEAN) AS $$
DECLARE
  v_park_id UUID;
  v_has_subscription BOOLEAN;
  v_has_active_qr BOOLEAN;
  v_has_reservation BOOLEAN;
BEGIN
  -- Get the park ID for this lock
  SELECT park_id INTO v_park_id
  FROM smart_locks
  WHERE lock_id = p_lock_id;
  
  -- Check if user has an active subscription
  SELECT EXISTS (
    SELECT 1
    FROM stripe_user_subscriptions
    WHERE status IN ('active', 'trialing')
  ) INTO v_has_subscription;
  
  -- Check if user has an active QR code
  SELECT EXISTS (
    SELECT 1
    FROM entrance_qr_codes
    WHERE user_id = p_user_id
    AND status = 'active'
    AND valid_until > now()
  ) INTO v_has_active_qr;
  
  -- Check if user has a reservation for today
  SELECT EXISTS (
    SELECT 1
    FROM reservations
    WHERE user_id = p_user_id
    AND park_id = v_park_id
    AND date = CURRENT_DATE
    AND status = 'confirmed'
  ) INTO v_has_reservation;
  
  -- Return true if any access method is valid
  RETURN QUERY SELECT (v_has_subscription OR v_has_active_qr OR v_has_reservation) AS has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired PINs
CREATE OR REPLACE FUNCTION cleanup_expired_pins()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM smart_lock_pins
  WHERE expires_at < now() AND is_used = FALSE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'cleanup_expired_pins_trigger'
  ) THEN
    CREATE TRIGGER cleanup_expired_pins_trigger
    AFTER INSERT ON smart_lock_pins
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_expired_pins();
  END IF;
END
$$;

-- Function to get current park occupancy
CREATE OR REPLACE FUNCTION get_park_occupancy(p_park_id UUID)
RETURNS TABLE (
  current_occupancy INT,
  max_capacity INT,
  occupancy_percentage NUMERIC,
  status TEXT
) AS $$
DECLARE
  v_current INT;
  v_max INT;
  v_percentage NUMERIC;
  v_status TEXT;
BEGIN
  -- Get current and max occupancy
  SELECT dp.current_occupancy, dp.max_capacity
  INTO v_current, v_max
  FROM dog_parks dp
  WHERE dp.id = p_park_id;
  
  -- Calculate percentage
  v_percentage := (v_current::NUMERIC / v_max::NUMERIC) * 100;
  
  -- Determine status
  IF v_percentage < 25 THEN
    v_status := 'empty';
  ELSIF v_percentage < 50 THEN
    v_status := 'somewhat_empty';
  ELSIF v_percentage < 75 THEN
    v_status := 'somewhat_crowded';
  ELSE
    v_status := 'crowded';
  END IF;
  
  RETURN QUERY SELECT 
    v_current AS current_occupancy,
    v_max AS max_capacity,
    v_percentage AS occupancy_percentage,
    v_status AS status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;