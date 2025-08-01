-- Add updated_at column to dog_parks table
ALTER TABLE dog_parks
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add comment for documentation
COMMENT ON COLUMN dog_parks.updated_at IS 'Timestamp of last update';

SELECT 'Added updated_at column to dog_parks table' as message; 