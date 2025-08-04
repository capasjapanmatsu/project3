-- 既存のfacility_reviewsポリシーを削除してから再作成

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Anyone can view facility reviews" ON facility_reviews;
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON facility_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON facility_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON facility_reviews;

-- 施設レビューテーブルを作成（既に存在する場合はスキップ）
CREATE TABLE IF NOT EXISTS facility_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES pet_facilities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dog_name VARCHAR(100) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    visit_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(facility_id, user_id)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_facility_reviews_facility_id ON facility_reviews(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_reviews_user_id ON facility_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_facility_reviews_rating ON facility_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_facility_reviews_created_at ON facility_reviews(created_at DESC);

-- RLSを有効化
ALTER TABLE facility_reviews ENABLE ROW LEVEL SECURITY;

-- ポリシーを再作成
CREATE POLICY "Anyone can view facility reviews" ON facility_reviews
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert reviews" ON facility_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON facility_reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON facility_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- ビューを作成（既存の場合は置き換え）
CREATE OR REPLACE VIEW facility_rating_summary AS
SELECT 
    facility_id,
    COUNT(*) as review_count,
    ROUND(AVG(rating)::numeric, 1) as average_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1_count
FROM facility_reviews
GROUP BY facility_id; 