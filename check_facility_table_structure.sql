-- ======================================
-- 施設テーブル構造確認SQL
-- ======================================

-- 1. 施設関連のテーブル名を探す
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%facilit%'
ORDER BY table_name;

-- 2. その他の関連テーブルも確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%pet%' OR table_name LIKE '%dog%' OR table_name LIKE '%park%')
ORDER BY table_name;

-- 3. すべてのテーブル一覧を表示
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. 施設画像テーブルの構造を確認
\d facility_images;

-- 5. 既存の施設画像データがあるか確認
SELECT COUNT(*) as total_images FROM facility_images;

-- 6. 施設画像テーブルから施設IDの参照先を確認
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='facility_images'; 