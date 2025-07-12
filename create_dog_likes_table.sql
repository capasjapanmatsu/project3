-- いいね機能のためのdog_likesテーブルを作成

-- Create dog_likes table
CREATE TABLE IF NOT EXISTS dog_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dog_id uuid NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- 1人のユーザーが同じ犬に複数回いいねできないようにする
  CONSTRAINT unique_user_dog_like UNIQUE (user_id, dog_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dog_likes_user_id ON dog_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_dog_likes_dog_id ON dog_likes(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_likes_created_at ON dog_likes(created_at);

-- Enable RLS
ALTER TABLE dog_likes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all likes"
  ON dog_likes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like dogs"
  ON dog_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike dogs"
  ON dog_likes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add like_count column to dogs table for caching
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0;

-- Function to update like count
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

-- Create trigger to automatically update like count
DROP TRIGGER IF EXISTS update_dog_like_count_trigger ON dog_likes;
CREATE TRIGGER update_dog_like_count_trigger
  AFTER INSERT OR DELETE ON dog_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_dog_like_count();

-- Update existing like counts (if any data exists)
UPDATE dogs SET like_count = (
  SELECT COUNT(*) FROM dog_likes WHERE dog_likes.dog_id = dogs.id
); 