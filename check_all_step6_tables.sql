-- すべてのステップ6関連テーブルの存在確認
SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN 'EXISTS'
        ELSE 'NOT EXISTS'
    END as status
FROM (
    VALUES 
        ('access_logs'),
        ('dog_park_stats'),
        ('shared_access_logs'),
        ('friendships'),
        ('blacklists'),
        ('notifications')
) AS expected(table_name)
LEFT JOIN information_schema.tables actual
    ON expected.table_name = actual.table_name
    AND actual.table_schema = 'public'
ORDER BY expected.table_name;
