-- facility_reviewsテーブルに画像アップロード機能を追加

-- 画像URL用のカラムを追加
ALTER TABLE facility_reviews 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 画像URLカラムにコメントを追加
COMMENT ON COLUMN facility_reviews.image_url IS 'レビュー画像のURL（1枚のみ）';

-- 既存のdog_nameカラムのコメントを更新
COMMENT ON COLUMN facility_reviews.dog_name IS 'ワンちゃん名（ちゃん・くん付け）→「○○ちゃんの飼い主さん」として表示';

-- テーブル構造確認用クエリ
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'facility_reviews'
AND table_schema = 'public'
ORDER BY ordinal_position; 