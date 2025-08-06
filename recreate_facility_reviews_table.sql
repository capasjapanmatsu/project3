-- facility_reviewsテーブルを削除して再作成（一意制約なし）

-- 既存のテーブルを削除
DROP TABLE IF EXISTS facility_reviews CASCADE;

-- 新しいテーブルを作成（一意制約なし）
CREATE TABLE facility_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL,
  user_id UUID NOT NULL,
  dog_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  visit_date DATE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成（一意制約ではない通常のインデックス）
CREATE INDEX idx_facility_reviews_facility_id ON facility_reviews(facility_id);
CREATE INDEX idx_facility_reviews_user_id ON facility_reviews(user_id);
CREATE INDEX idx_facility_reviews_created_at ON facility_reviews(created_at);

-- RLSポリシーを有効化
ALTER TABLE facility_reviews ENABLE ROW LEVEL SECURITY;

-- RLSポリシーを作成
CREATE POLICY "Anyone can view facility reviews" ON facility_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own facility reviews" ON facility_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facility reviews" ON facility_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facility reviews" ON facility_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- テーブルの権限を設定
GRANT ALL ON facility_reviews TO authenticated;
GRANT SELECT ON facility_reviews TO anon;