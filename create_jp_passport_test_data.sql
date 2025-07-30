-- JPパスポート機能のテスト用ワクチンデータ作成

-- 既存の犬のIDを取得して、ワクチン証明書を追加

-- 1. 最初の3匹の犬にテスト用ワクチンデータを追加
WITH test_dogs AS (
  SELECT id, name FROM dogs 
  ORDER BY created_at 
  LIMIT 3
)
INSERT INTO vaccine_certifications (
  dog_id,
  rabies_vaccine_image,
  combo_vaccine_image,
  rabies_expiry_date,
  combo_expiry_date,
  status,
  created_at,
  updated_at
)
SELECT 
  td.id,
  'https://example.com/rabies_cert_' || td.name || '.jpg',
  'https://example.com/combo_cert_' || td.name || '.jpg',
  CURRENT_DATE + INTERVAL '11 months', -- 11ヶ月後（有効）
  CURRENT_DATE + INTERVAL '10 months', -- 10ヶ月後（有効）
  'approved',
  NOW() - INTERVAL '1 month', -- 1ヶ月前に作成
  NOW() - INTERVAL '1 month'
FROM test_dogs;

-- 2. 期限切れのワクチンデータも追加（テスト用）
WITH expired_dogs AS (
  SELECT id, name FROM dogs 
  ORDER BY created_at 
  LIMIT 1 OFFSET 3
)
INSERT INTO vaccine_certifications (
  dog_id,
  rabies_vaccine_image,
  combo_vaccine_image,
  rabies_expiry_date,
  combo_expiry_date,
  status,
  created_at,
  updated_at
)
SELECT 
  ed.id,
  'https://example.com/expired_rabies_' || ed.name || '.jpg',
  'https://example.com/expired_combo_' || ed.name || '.jpg',
  CURRENT_DATE - INTERVAL '2 months', -- 2ヶ月前に期限切れ
  CURRENT_DATE - INTERVAL '1 months', -- 1ヶ月前に期限切れ
  'approved',
  NOW() - INTERVAL '6 months', -- 6ヶ月前に作成
  NOW() - INTERVAL '6 months'
FROM expired_dogs;

-- 3. 期限間近のワクチンデータ（警告表示テスト用）
WITH warning_dogs AS (
  SELECT id, name FROM dogs 
  ORDER BY created_at 
  LIMIT 1 OFFSET 4
)
INSERT INTO vaccine_certifications (
  dog_id,
  rabies_vaccine_image,
  combo_vaccine_image,
  rabies_expiry_date,
  combo_expiry_date,
  status,
  created_at,
  updated_at
)
SELECT 
  wd.id,
  'https://example.com/warning_rabies_' || wd.name || '.jpg',
  'https://example.com/warning_combo_' || wd.name || '.jpg',
  CURRENT_DATE + INTERVAL '25 days', -- 25日後（警告）
  CURRENT_DATE + INTERVAL '20 days', -- 20日後（警告）
  'approved',
  NOW() - INTERVAL '11 months', -- 11ヶ月前に作成
  NOW() - INTERVAL '11 months'
FROM warning_dogs;

-- 4. 確認用クエリ
SELECT 
  d.name as dog_name,
  d.breed,
  vc.rabies_expiry_date,
  vc.combo_expiry_date,
  vc.status,
  CASE 
    WHEN vc.rabies_expiry_date > CURRENT_DATE THEN 'valid'
    WHEN vc.rabies_expiry_date > CURRENT_DATE - INTERVAL '30 days' THEN 'warning'
    ELSE 'expired'
  END as rabies_status,
  CASE 
    WHEN vc.combo_expiry_date > CURRENT_DATE THEN 'valid'
    WHEN vc.combo_expiry_date > CURRENT_DATE - INTERVAL '30 days' THEN 'warning'
    ELSE 'expired'
  END as combo_status
FROM dogs d
JOIN vaccine_certifications vc ON d.id = vc.dog_id
WHERE vc.status = 'approved'
ORDER BY d.name; 