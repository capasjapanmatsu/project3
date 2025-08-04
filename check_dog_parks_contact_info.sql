-- dog_parksテーブルの構造を確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'dog_parks' 
ORDER BY ordinal_position;

-- contact_infoカラムが存在するかチェック
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'dog_parks' 
    AND column_name = 'contact_info'
) as contact_info_exists;

-- 現在のdog_parksテーブルのサンプルデータを確認
SELECT id, name, status, created_at, updated_at
FROM dog_parks 
LIMIT 5;