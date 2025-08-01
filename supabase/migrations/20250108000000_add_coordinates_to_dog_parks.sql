-- Add latitude and longitude columns to dog_parks table
ALTER TABLE dog_parks
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dog_parks_coordinates ON dog_parks(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_dog_parks_latitude ON dog_parks(latitude);
CREATE INDEX IF NOT EXISTS idx_dog_parks_longitude ON dog_parks(longitude);

-- Add comments for documentation
COMMENT ON COLUMN dog_parks.latitude IS 'Latitude coordinate for map display (WGS84)';
COMMENT ON COLUMN dog_parks.longitude IS 'Longitude coordinate for map display (WGS84)';

SELECT 'Added latitude and longitude columns to dog_parks table' as message; 