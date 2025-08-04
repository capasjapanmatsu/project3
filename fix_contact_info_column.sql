-- dog_parksテーブルにcontact_infoカラムを追加
ALTER TABLE dog_parks 
ADD COLUMN contact_info TEXT;

-- 確認クエリ
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'dog_parks' 
AND column_name = 'contact_info';

-- 成功メッセージ
SELECT 'contact_info column successfully added to dog_parks table' as result;