-- access_logsテーブルの構造を確認
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'access_logs'
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;
