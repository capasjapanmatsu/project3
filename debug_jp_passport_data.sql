-- JPパスポート用のワクチンデータ確認クエリ

-- 1. dogs テーブルの確認
SELECT 
  COUNT(*) as total_dogs,
  COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as dogs_with_images
FROM dogs;

-- 2. vaccine_certifications テーブルの確認
SELECT 
  COUNT(*) as total_certifications,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_certifications,
  COUNT(CASE WHEN rabies_expiry_date IS NOT NULL THEN 1 END) as with_rabies_data,
  COUNT(CASE WHEN combo_expiry_date IS NOT NULL THEN 1 END) as with_combo_data
FROM vaccine_certifications;

-- 3. dogs と vaccine_certifications の結合確認
SELECT 
  d.id,
  d.name,
  d.breed,
  d.image_url,
  vc.status,
  vc.rabies_expiry_date,
  vc.combo_expiry_date,
  vc.created_at
FROM dogs d
LEFT JOIN vaccine_certifications vc ON d.id = vc.dog_id
ORDER BY d.name, vc.created_at DESC
LIMIT 10;

-- 4. 承認済みで有効期限が将来のワクチン証明書
SELECT 
  d.name as dog_name,
  d.breed,
  vc.rabies_expiry_date,
  vc.combo_expiry_date,
  vc.status,
  CASE 
    WHEN vc.rabies_expiry_date > CURRENT_DATE THEN 'valid'
    ELSE 'expired'
  END as rabies_status,
  CASE 
    WHEN vc.combo_expiry_date > CURRENT_DATE THEN 'valid'
    ELSE 'expired'
  END as combo_status
FROM dogs d
JOIN vaccine_certifications vc ON d.id = vc.dog_id
WHERE vc.status = 'approved'
ORDER BY d.name;

-- 5. 現在のユーザーの犬とワクチン情報（authが有効な場合）
-- SELECT 
--   d.name as dog_name,
--   d.breed,
--   vc.rabies_expiry_date,
--   vc.combo_expiry_date,
--   vc.status
-- FROM dogs d
-- LEFT JOIN vaccine_certifications vc ON d.id = vc.dog_id
-- WHERE d.owner_id = auth.uid()
-- ORDER BY d.name; 