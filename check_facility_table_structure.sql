-- pet_facilitiesテーブルの構造を確認
\d pet_facilities;

-- 存在しないカラムがある場合、追加
ALTER TABLE pet_facilities 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);

-- テーブルの現在の構造を再度確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pet_facilities' 
ORDER BY ordinal_position;
