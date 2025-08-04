-- maintenance_schedulesテーブルの構造を確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'maintenance_schedules' 
ORDER BY ordinal_position;

-- テーブルが存在するかチェック
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'maintenance_schedules'
) as table_exists;