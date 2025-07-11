-- ワクチン証明書の画像パスを確認するクエリ
SELECT 
  vc.id,
  vc.dog_id,
  d.name as dog_name,
  vc.rabies_vaccine_image,
  vc.combo_vaccine_image,
  vc.status,
  vc.created_at,
  vc.updated_at
FROM vaccine_certifications vc
JOIN dogs d ON vc.dog_id = d.id
WHERE vc.status = 'pending'
ORDER BY vc.created_at DESC
LIMIT 10; 