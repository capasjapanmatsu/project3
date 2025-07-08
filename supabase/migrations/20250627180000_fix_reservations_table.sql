-- Fix reservations table creation order
-- Create reservations table first, then add constraints

-- Create reservations table if it doesn't exist
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id uuid,
  user_id uuid,
  dog_id uuid,
  date date,
  start_time time,
  duration integer,
  status text DEFAULT 'confirmed',
  total_amount integer DEFAULT 0,
  access_code text DEFAULT '',
  qr_code text,
  reservation_type text DEFAULT 'regular',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add NOT NULL constraints and foreign keys after ensuring the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservations') THEN
    
    -- Add NOT NULL constraints gradually
    UPDATE reservations SET park_id = gen_random_uuid() WHERE park_id IS NULL;
    UPDATE reservations SET user_id = gen_random_uuid() WHERE user_id IS NULL;
    UPDATE reservations SET dog_id = gen_random_uuid() WHERE dog_id IS NULL;
    UPDATE reservations SET date = CURRENT_DATE WHERE date IS NULL;
    UPDATE reservations SET start_time = '10:00:00' WHERE start_time IS NULL;
    UPDATE reservations SET duration = 1 WHERE duration IS NULL;
    
    -- Now add NOT NULL constraints
    ALTER TABLE reservations ALTER COLUMN park_id SET NOT NULL;
    ALTER TABLE reservations ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE reservations ALTER COLUMN dog_id SET NOT NULL;
    ALTER TABLE reservations ALTER COLUMN date SET NOT NULL;
    ALTER TABLE reservations ALTER COLUMN start_time SET NOT NULL;
    ALTER TABLE reservations ALTER COLUMN duration SET NOT NULL;
    ALTER TABLE reservations ALTER COLUMN status SET NOT NULL;
    ALTER TABLE reservations ALTER COLUMN total_amount SET NOT NULL;
    ALTER TABLE reservations ALTER COLUMN access_code SET NOT NULL;
    
  END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'reservations_duration_check'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_duration_check CHECK (duration > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'reservations_status_check'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_status_check CHECK (status IN ('confirmed', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'reservations_total_amount_check'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_total_amount_check CHECK (total_amount >= 0);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Create policies for reservations
DROP POLICY IF EXISTS "ユーザーは自分の予約を参照可能" ON reservations;
DROP POLICY IF EXISTS "ユーザーは予約の作成が可能" ON reservations;
DROP POLICY IF EXISTS "ユーザーは自分の予約のみ更新可能" ON reservations;

CREATE POLICY "ユーザーは自分の予約を参照可能"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM dog_parks
      WHERE dog_parks.id = reservations.park_id
      AND dog_parks.owner_id = auth.uid()
    )
  );

CREATE POLICY "ユーザーは予約の作成が可能"
  ON reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ユーザーは自分の予約のみ更新可能"
  ON reservations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add foreign key constraints (will be added later when referenced tables exist)
-- These will be added in a separate migration after ensuring all referenced tables exist 