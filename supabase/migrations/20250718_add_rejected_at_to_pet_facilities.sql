-- Add rejected_at column to dog_parks table
-- This allows facilities to be rejected with a timestamp

ALTER TABLE dog_parks 
ADD COLUMN rejected_at timestamptz;

-- Add index for better query performance on rejected facilities
CREATE INDEX idx_dog_parks_rejected_at ON dog_parks(rejected_at);

-- Add comment for documentation
COMMENT ON COLUMN dog_parks.rejected_at IS 'Timestamp when the facility was rejected by admin';
