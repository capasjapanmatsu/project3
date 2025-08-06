-- facility_reviewsテーブルを作成（簡易版）
CREATE TABLE IF NOT EXISTS facility_reviews (
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

-- RLSポリシーを有効化
ALTER TABLE facility_reviews ENABLE ROW LEVEL SECURITY;

-- 基本的なRLSポリシーを作成
CREATE POLICY "Anyone can view facility reviews" ON facility_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own facility reviews" ON facility_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- テーブルの権限を設定
GRANT ALL ON facility_reviews TO authenticated;
GRANT SELECT ON facility_reviews TO anon;