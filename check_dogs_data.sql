-- 犬テーブルの状態を確認
SELECT COUNT(*) as total_dogs FROM dogs;

-- 最近追加された犬を確認
SELECT 
    id,
    name,
    breed,
    gender,
    created_at,
    image_url
FROM dogs 
ORDER BY created_at DESC 
LIMIT 5;

-- 犬テーブルの構造確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dogs'; 