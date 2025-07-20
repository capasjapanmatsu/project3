-- ドッグパークデータの確認
SELECT 
    id,
    name,
    address,
    is_active,
    is_open,
    created_at
FROM dog_parks
ORDER BY created_at DESC
LIMIT 10;

-- アクティブなドッグパークの数
SELECT COUNT(*) as active_parks_count
FROM dog_parks
WHERE is_active = true;

-- 全ドッグパークの数
SELECT COUNT(*) as total_parks_count
FROM dog_parks;

-- テーブルの存在確認
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'dog_parks'
) AS table_exists; 