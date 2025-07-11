-- vaccine_certifications テーブルの構造を確認

-- テーブルの存在確認
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE table_name = 'vaccine_certifications';

-- カラムの詳細情報を取得
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'vaccine_certifications' 
ORDER BY ordinal_position;

-- 既存のデータを確認
SELECT * FROM vaccine_certifications LIMIT 5;

-- 制約情報を確認
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    tc.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'vaccine_certifications'; 