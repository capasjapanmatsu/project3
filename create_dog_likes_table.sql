-- dog_likesテーブルを作成
CREATE TABLE IF NOT EXISTS dog_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, dog_id)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_dog_likes_user_id ON dog_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_dog_likes_dog_id ON dog_likes(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_likes_created_at ON dog_likes(created_at);

-- RLSポリシーを有効化
ALTER TABLE dog_likes ENABLE ROW LEVEL SECURITY;

-- RLSポリシーを作成
DROP POLICY IF EXISTS "Users can view all dog likes" ON dog_likes;
CREATE POLICY "Users can view all dog likes" ON dog_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own dog likes" ON dog_likes;
CREATE POLICY "Users can manage their own dog likes" ON dog_likes
  FOR ALL USING (auth.uid() = user_id);

-- テーブルの権限を設定
GRANT ALL ON dog_likes TO authenticated;
GRANT ALL ON dog_likes TO anon;