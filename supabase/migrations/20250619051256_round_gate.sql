/*
# Smart Lock System Integration

1. New Tables
  - `lock_access_logs` - Logs all smart lock access attempts
  - `smart_locks` - Stores information about smart locks at each facility

2. Functions
  - `check_user_park_access` - Checks if a user has access to a specific park/lock

3. Security
  - Enable RLS on new tables
  - Add appropriate access policies
*/

-- Create smart_locks table
CREATE TABLE IF NOT EXISTS smart_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id uuid NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  lock_id text NOT NULL UNIQUE,
  lock_name text NOT NULL,
  lock_type text NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'active',
  last_online_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create lock_access_logs table
CREATE TABLE IF NOT EXISTS lock_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lock_id text NOT NULL,
  action text NOT NULL,
  status text NOT NULL,
  timestamp timestamptz NOT NULL,
  response_data jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS smart_locks_park_id_idx ON smart_locks(park_id);
CREATE INDEX IF NOT EXISTS smart_locks_lock_id_idx ON smart_locks(lock_id);
CREATE INDEX IF NOT EXISTS lock_access_logs_user_id_idx ON lock_access_logs(user_id);
CREATE INDEX IF NOT EXISTS lock_access_logs_lock_id_idx ON lock_access_logs(lock_id);
CREATE INDEX IF NOT EXISTS lock_access_logs_timestamp_idx ON lock_access_logs(timestamp);

-- Enable RLS
ALTER TABLE smart_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lock_access_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for smart_locks
CREATE POLICY "Park owners can manage their locks" 
  ON smart_locks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dog_parks
      WHERE dog_parks.id = smart_locks.park_id
      AND dog_parks.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view locks" 
  ON smart_locks
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for lock_access_logs
CREATE POLICY "Users can view their own access logs" 
  ON lock_access_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Park owners can view access logs for their parks" 
  ON lock_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM smart_locks
      JOIN dog_parks ON smart_locks.park_id = dog_parks.id
      WHERE smart_locks.lock_id = lock_access_logs.lock_id
      AND dog_parks.owner_id = auth.uid()
    )
  );

-- Function to check if a user has access to a park/lock
CREATE OR REPLACE FUNCTION check_user_park_access(p_user_id uuid, p_lock_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_park_id uuid;
  v_has_active_subscription boolean;
  v_has_active_entrance_qr boolean;
  v_has_active_reservation boolean;
  v_result jsonb;
BEGIN
  -- Get the park_id for the lock
  SELECT park_id INTO v_park_id
  FROM smart_locks
  WHERE lock_id = p_lock_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'Lock not found'
    );
  END IF;
  
  -- Check if user has an active subscription
  SELECT EXISTS (
    SELECT 1
    FROM stripe_user_subscriptions
    WHERE customer_id IN (
      SELECT customer_id
      FROM stripe_customers
      WHERE user_id = p_user_id
      AND deleted_at IS NULL
    )
    AND subscription_status IN ('active', 'trialing')
  ) INTO v_has_active_subscription;
  
  -- Check if user has an active entrance QR code
  SELECT EXISTS (
    SELECT 1
    FROM entrance_qr_codes
    WHERE user_id = p_user_id
    AND status = 'active'
    AND valid_until > now()
  ) INTO v_has_active_entrance_qr;
  
  -- Check if user has an active reservation for this park
  SELECT EXISTS (
    SELECT 1
    FROM reservations
    WHERE user_id = p_user_id
    AND park_id = v_park_id
    AND status = 'confirmed'
    AND date = CURRENT_DATE
    AND (
      EXTRACT(HOUR FROM CURRENT_TIME) >= CAST(start_time AS integer)
      AND EXTRACT(HOUR FROM CURRENT_TIME) < (CAST(start_time AS integer) + duration)
    )
  ) INTO v_has_active_reservation;
  
  -- Build the result
  v_result := jsonb_build_object(
    'has_access', (v_has_active_subscription OR v_has_active_entrance_qr OR v_has_active_reservation),
    'park_id', v_park_id,
    'has_subscription', v_has_active_subscription,
    'has_entrance_qr', v_has_active_entrance_qr,
    'has_reservation', v_has_active_reservation
  );
  
  RETURN v_result;
END;
$$;