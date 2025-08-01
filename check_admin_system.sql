-- 1. profilesテーブルの構造を確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. profilesテーブルのデータを確認
SELECT * FROM profiles WHERE email = 'capasjapan@gmail.com';

-- 3. 管理者関連のテーブルがあるかチェック
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%admin%';

-- 4. 現在のis_admin_user関数の定義を確認
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_name = 'is_admin_user'; 