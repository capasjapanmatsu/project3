-- ドッグランレビューに画像機能を追加

-- レビューテーブルに画像関連カラムを追加
ALTER TABLE dog_park_reviews 
ADD COLUMN IF NOT EXISTS review_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS main_image_url TEXT DEFAULT NULL;

-- コメントを追加
COMMENT ON COLUMN dog_park_reviews.review_images IS 'Array of review image URLs and captions';
COMMENT ON COLUMN dog_park_reviews.main_image_url IS 'Main review image URL for quick display';

-- レビュー画像専用テーブル（将来的な拡張のため）
CREATE TABLE IF NOT EXISTS dog_park_review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES dog_park_reviews(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON dog_park_review_images(review_id);
CREATE INDEX IF NOT EXISTS idx_review_images_display_order ON dog_park_review_images(review_id, display_order);

-- RLSの設定
ALTER TABLE dog_park_review_images ENABLE ROW LEVEL SECURITY;

-- レビュー画像のポリシー
CREATE POLICY "レビュー画像は誰でも参照可能"
  ON dog_park_review_images
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "レビュー画像は作成者のみ管理可能"
  ON dog_park_review_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dog_park_reviews
      WHERE dog_park_reviews.id = dog_park_review_images.review_id
      AND dog_park_reviews.user_id = auth.uid()
    )
  );

-- レビュー取得関数を更新（画像付き）
CREATE OR REPLACE FUNCTION get_park_reviews_with_images(park_id_param uuid)
RETURNS TABLE (
  id uuid,
  rating integer,
  review_text text,
  visit_date date,
  created_at timestamptz,
  updated_at timestamptz,
  user_name text,
  dog_name text,
  dog_image_url text,
  dog_breed text,
  main_image_url text,
  review_images jsonb,
  image_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.rating,
    r.review_text,
    r.visit_date,
    r.created_at,
    r.updated_at,
    p.name as user_name,
    d.name as dog_name,
    d.image_url as dog_image_url,
    d.breed as dog_breed,
    r.main_image_url,
    COALESCE(r.review_images, '[]'::jsonb) as review_images,
    (
      SELECT COUNT(*)::integer 
      FROM dog_park_review_images ri 
      WHERE ri.review_id = r.id
    ) as image_count
  FROM dog_park_reviews r
  JOIN profiles p ON r.user_id = p.id
  JOIN dogs d ON r.dog_id = d.id
  WHERE r.park_id = park_id_param
  ORDER BY r.created_at DESC;
END;
$$;

-- 権限付与
GRANT EXECUTE ON FUNCTION get_park_reviews_with_images TO authenticated; 