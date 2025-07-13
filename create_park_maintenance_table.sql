-- ドッグランメンテナンス管理テーブルの作成

-- Create park_maintenance table
CREATE TABLE IF NOT EXISTS park_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id uuid NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  is_emergency boolean DEFAULT false,
  notify_users boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  
  -- メンテナンス期間の妥当性チェック
  CONSTRAINT valid_maintenance_period CHECK (end_date > start_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_park_maintenance_park_id ON park_maintenance(park_id);
CREATE INDEX IF NOT EXISTS idx_park_maintenance_dates ON park_maintenance(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_park_maintenance_status ON park_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_park_maintenance_active ON park_maintenance(park_id, status) WHERE status = 'active';

-- Enable RLS
ALTER TABLE park_maintenance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Park owners can manage their park maintenance"
  ON park_maintenance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dog_parks
      WHERE dog_parks.id = park_maintenance.park_id
      AND dog_parks.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dog_parks
      WHERE dog_parks.id = park_maintenance.park_id
      AND dog_parks.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view maintenance for parks they access"
  ON park_maintenance
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to automatically update status based on dates
CREATE OR REPLACE FUNCTION update_maintenance_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on current time
  IF NEW.start_date <= NOW() AND NEW.end_date > NOW() AND NEW.status = 'scheduled' THEN
    NEW.status = 'active';
  ELSIF NEW.end_date <= NOW() AND NEW.status IN ('scheduled', 'active') THEN
    NEW.status = 'completed';
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update status
DROP TRIGGER IF EXISTS update_maintenance_status_trigger ON park_maintenance;
CREATE TRIGGER update_maintenance_status_trigger
  BEFORE INSERT OR UPDATE ON park_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_status();

-- Function to check if a park is currently under maintenance
CREATE OR REPLACE FUNCTION is_park_under_maintenance(park_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM park_maintenance
    WHERE park_id = park_id_param
    AND status = 'active'
    AND start_date <= NOW()
    AND end_date > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current maintenance info for a park
CREATE OR REPLACE FUNCTION get_park_maintenance_info(park_id_param uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  is_emergency boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id,
    pm.title,
    pm.description,
    pm.start_date,
    pm.end_date,
    pm.is_emergency
  FROM park_maintenance pm
  WHERE pm.park_id = park_id_param
  AND pm.status = 'active'
  AND pm.start_date <= NOW()
  AND pm.end_date > NOW()
  ORDER BY pm.start_date ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add maintenance status to dog_parks table
ALTER TABLE dog_parks ADD COLUMN IF NOT EXISTS maintenance_status text DEFAULT 'operational' CHECK (maintenance_status IN ('operational', 'maintenance', 'emergency_maintenance'));

-- Function to update park maintenance status
CREATE OR REPLACE FUNCTION update_park_maintenance_status()
RETURNS void AS $$
BEGIN
  -- Update all parks based on current maintenance schedules
  UPDATE dog_parks SET maintenance_status = 
    CASE 
      WHEN is_park_under_maintenance(id) THEN
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM park_maintenance 
            WHERE park_id = dog_parks.id 
            AND status = 'active' 
            AND is_emergency = true
          ) THEN 'emergency_maintenance'
          ELSE 'maintenance'
        END
      ELSE 'operational'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function that runs automatically to update maintenance statuses
-- This should be called periodically (e.g., every hour) via a cron job or similar
CREATE OR REPLACE FUNCTION maintenance_status_updater()
RETURNS void AS $$
BEGIN
  -- Update maintenance record statuses
  UPDATE park_maintenance 
  SET status = 'active',
      updated_at = NOW()
  WHERE status = 'scheduled' 
  AND start_date <= NOW();
  
  UPDATE park_maintenance 
  SET status = 'completed',
      updated_at = NOW()
  WHERE status IN ('scheduled', 'active') 
  AND end_date <= NOW();
  
  -- Update park maintenance statuses
  PERFORM update_park_maintenance_status();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 