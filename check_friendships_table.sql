-- friendshipsテーブルの存在確認
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'friendships'
) as table_exists;

-- friendshipsテーブルの構造確認（存在する場合）
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'friendships'
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;
