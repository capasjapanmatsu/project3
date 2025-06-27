/*
  # ドッグランレビューシステム

  1. New Tables
    - `dog_park_reviews`
      - `id` (uuid, primary key)
      - `park_id` (uuid, foreign key to dog_parks)
      - `user_id` (uuid, foreign key to profiles)
      - `dog_id` (uuid, foreign key to dogs) - レビューしたワンちゃん
      - `rating` (integer, 1-5 stars)
      - `review_text` (text)
      - `visit_date` (date) - 実際に訪問した日
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `dog_park_reviews` table
    - Add policies for authenticated users to manage their own reviews
    - Add policy for everyone to read reviews

  3. Functions
    - Update park average rating function
    - Review validation function

  4. Triggers
    - Auto-update park rating when review is added/updated/deleted
*/

-- Create dog_park_reviews table
CREATE TABLE IF NOT EXISTS dog_park_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id uuid NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dog_id uuid NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  visit_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- ユーザーは同じドッグランに対して1つのレビューのみ
  UNIQUE(park_id, user_id)
);

-- Add rating fields to dog_parks table
DO $$
BEGIN
  -- 平均評価を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dog_parks' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN average_rating numeric(3,2) DEFAULT 0.0;
  END IF;

  -- レビュー数を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dog_parks' AND column_name = 'review_count'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN review_count integer DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE dog_park_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "レビューは誰でも参照可能"
  ON dog_park_reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "レビューは本人のみ作成可能"
  ON dog_park_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "レビューは本人のみ更新可能"
  ON dog_park_reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "レビューは本人のみ削除可能"
  ON dog_park_reviews
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update park rating
CREATE OR REPLACE FUNCTION update_park_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  park_id_to_update uuid;
  new_avg_rating numeric(3,2);
  new_review_count integer;
BEGIN
  -- 更新対象のpark_idを決定
  IF TG_OP = 'DELETE' THEN
    park_id_to_update := OLD.park_id;
  ELSE
    park_id_to_update := NEW.park_id;
  END IF;

  -- 平均評価と件数を計算
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0.0),
    COUNT(*)
  INTO new_avg_rating, new_review_count
  FROM dog_park_reviews
  WHERE park_id = park_id_to_update;

  -- ドッグランテーブルを更新
  UPDATE dog_parks
  SET 
    average_rating = new_avg_rating,
    review_count = new_review_count
  WHERE id = park_id_to_update;

  -- 戻り値
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for rating updates
DROP TRIGGER IF EXISTS update_park_rating_trigger ON dog_park_reviews;
CREATE TRIGGER update_park_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON dog_park_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_park_rating();

-- Function to check if user can review (must have visited the park)
CREATE OR REPLACE FUNCTION can_user_review_park(
  user_id_param uuid,
  park_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_visited boolean := false;
BEGIN
  -- ユーザーがそのドッグランを実際に利用したかチェック
  SELECT EXISTS(
    SELECT 1 FROM reservations
    WHERE user_id = user_id_param
      AND park_id = park_id_param
      AND status = 'confirmed'
      AND date <= CURRENT_DATE
  ) INTO has_visited;

  RETURN has_visited;
END;
$$;

-- Function to get park reviews with user and dog info
CREATE OR REPLACE FUNCTION get_park_reviews(park_id_param uuid)
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
  dog_breed text
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
    d.breed as dog_breed
  FROM dog_park_reviews r
  JOIN profiles p ON r.user_id = p.id
  JOIN dogs d ON r.dog_id = d.id
  WHERE r.park_id = park_id_param
  ORDER BY r.created_at DESC;
END;
$$;

-- Function to get user's review for a park
CREATE OR REPLACE FUNCTION get_user_park_review(
  user_id_param uuid,
  park_id_param uuid
)
RETURNS TABLE (
  id uuid,
  rating integer,
  review_text text,
  visit_date date,
  dog_id uuid,
  dog_name text,
  created_at timestamptz,
  updated_at timestamptz
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
    r.dog_id,
    d.name as dog_name,
    r.created_at,
    r.updated_at
  FROM dog_park_reviews r
  JOIN dogs d ON r.dog_id = d.id
  WHERE r.user_id = user_id_param
    AND r.park_id = park_id_param;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS dog_park_reviews_park_id_idx ON dog_park_reviews(park_id);
CREATE INDEX IF NOT EXISTS dog_park_reviews_user_id_idx ON dog_park_reviews(user_id);
CREATE INDEX IF NOT EXISTS dog_park_reviews_rating_idx ON dog_park_reviews(rating);
CREATE INDEX IF NOT EXISTS dog_park_reviews_created_at_idx ON dog_park_reviews(created_at DESC);

-- Update existing parks to have initial rating values
UPDATE dog_parks 
SET average_rating = 0.0, review_count = 0 
WHERE average_rating IS NULL OR review_count IS NULL;

-- Grant permissions
GRANT ALL ON dog_park_reviews TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_review_park TO authenticated;
GRANT EXECUTE ON FUNCTION get_park_reviews TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_park_review TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '=== ドッグランレビューシステム構築完了 ===';
  RAISE NOTICE '✓ レビューテーブル作成';
  RAISE NOTICE '✓ ★5段階評価システム';
  RAISE NOTICE '✓ ワンちゃん情報付きレビュー';
  RAISE NOTICE '✓ 平均評価自動計算';
  RAISE NOTICE '✓ 利用履歴チェック機能';
  RAISE NOTICE '✓ RLS セキュリティ設定';
END $$;