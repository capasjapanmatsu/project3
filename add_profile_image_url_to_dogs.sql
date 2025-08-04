-- dogsテーブルにprofile_image_urlカラムを追加

-- profile_image_urlカラムを追加
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- カラムにコメントを追加
COMMENT ON COLUMN dogs.profile_image_url IS 'ワンちゃんのプロフィール画像URL';

-- 既存のdogsテーブル構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'dogs'
AND table_schema = 'public'
ORDER BY ordinal_position; 