-- dog_parksテーブルに不足しているカラムを追加
-- 既に存在する場合はエラーを無視

-- operating_hoursカラムを追加
ALTER TABLE dog_parks 
ADD COLUMN IF NOT EXISTS operating_hours TEXT;

-- rulesカラムを追加
ALTER TABLE dog_parks 
ADD COLUMN IF NOT EXISTS rules TEXT;

-- contact_infoカラムを追加  
ALTER TABLE dog_parks 
ADD COLUMN IF NOT EXISTS contact_info TEXT;

-- 既存のデータに対してデフォルト値を設定（必要に応じて）
UPDATE dog_parks 
SET 
  operating_hours = COALESCE(operating_hours, '24時間営業'),
  rules = COALESCE(rules, ''),
  contact_info = COALESCE(contact_info, '')
WHERE operating_hours IS NULL OR rules IS NULL OR contact_info IS NULL;

-- 確認用：カラムが正しく追加されたか確認
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'dog_parks'
    AND column_name IN ('operating_hours', 'rules', 'contact_info')
ORDER BY 
    column_name;





