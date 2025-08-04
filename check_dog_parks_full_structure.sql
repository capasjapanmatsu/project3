-- dog_parksテーブルの完全な構造を確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'dog_parks' 
ORDER BY ordinal_position;

-- ParkEdit.tsxで使用されているカラムが存在するかチェック
SELECT 
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dog_parks' AND column_name = 'name') as name_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dog_parks' AND column_name = 'description') as description_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dog_parks' AND column_name = 'features') as features_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dog_parks' AND column_name = 'rules') as rules_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dog_parks' AND column_name = 'operating_hours') as operating_hours_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dog_parks' AND column_name = 'contact_info') as contact_info_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dog_parks' AND column_name = 'max_capacity') as max_capacity_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dog_parks' AND column_name = 'facilities') as facilities_exists;