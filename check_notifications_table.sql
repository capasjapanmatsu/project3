-- notificationsテーブルの存在確認
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'notifications'
) as table_exists;

-- notificationsテーブルの構造確認
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'notifications'
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;
