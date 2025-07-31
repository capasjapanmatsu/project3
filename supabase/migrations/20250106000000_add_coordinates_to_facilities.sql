-- Add latitude and longitude columns to pet_facilities table
-- This migration adds geographic coordinates to enable accurate map positioning

-- Add latitude and longitude columns
ALTER TABLE pet_facilities 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- Add indexes for geographic queries
CREATE INDEX IF NOT EXISTS idx_pet_facilities_coordinates ON pet_facilities(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_latitude ON pet_facilities(latitude);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_longitude ON pet_facilities(longitude);

-- Add comment for documentation
COMMENT ON COLUMN pet_facilities.latitude IS 'Latitude coordinate for map display (WGS84)';
COMMENT ON COLUMN pet_facilities.longitude IS 'Longitude coordinate for map display (WGS84)';

-- Success message
SELECT 'Added latitude and longitude columns to pet_facilities table' as message; 
-- This migration adds geographic coordinates to enable accurate map positioning

-- Add latitude and longitude columns
ALTER TABLE pet_facilities 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- Add indexes for geographic queries
CREATE INDEX IF NOT EXISTS idx_pet_facilities_coordinates ON pet_facilities(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_latitude ON pet_facilities(latitude);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_longitude ON pet_facilities(longitude);

-- Add comment for documentation
COMMENT ON COLUMN pet_facilities.latitude IS 'Latitude coordinate for map display (WGS84)';
COMMENT ON COLUMN pet_facilities.longitude IS 'Longitude coordinate for map display (WGS84)';

-- Success message
SELECT 'Added latitude and longitude columns to pet_facilities table' as message; 