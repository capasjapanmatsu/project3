-- Fix dog_likes table dependencies
-- This migration runs after dogs table is created to add foreign key constraints

-- Add foreign key constraint for dog_id (now that dogs table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dogs' AND table_schema = 'public') THEN
    -- Check if the foreign key constraint doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'dog_likes_dog_id_fkey' 
      AND table_name = 'dog_likes'
    ) THEN
      ALTER TABLE dog_likes 
      ADD CONSTRAINT dog_likes_dog_id_fkey 
      FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add like_count column to dogs table if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dogs' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'dogs' 
      AND column_name = 'like_count' 
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE dogs ADD COLUMN like_count integer DEFAULT 0;
    END IF;
  END IF;
END $$;

-- Create or replace function to update like count
CREATE OR REPLACE FUNCTION update_dog_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE dogs 
    SET like_count = like_count + 1 
    WHERE id = NEW.dog_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE dogs 
    SET like_count = like_count - 1 
    WHERE id = OLD.dog_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update like count (if dogs table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dogs' AND table_schema = 'public') THEN
    -- Drop trigger if it exists
    DROP TRIGGER IF EXISTS update_dog_like_count_trigger ON dog_likes;
    
    -- Create trigger
    CREATE TRIGGER update_dog_like_count_trigger
      AFTER INSERT OR DELETE ON dog_likes
      FOR EACH ROW
      EXECUTE FUNCTION update_dog_like_count();
  END IF;
END $$;

-- Update existing like counts (if any data exists and dogs table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dogs' AND table_schema = 'public') THEN
    UPDATE dogs SET like_count = (
      SELECT COUNT(*) FROM dog_likes WHERE dog_likes.dog_id = dogs.id
    );
  END IF;
END $$;
