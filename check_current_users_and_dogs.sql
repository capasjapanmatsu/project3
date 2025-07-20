-- 現在のユーザーと犬のデータを確認
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  p.nickname,
  p.created_at as user_created,
  d.id as dog_id,
  d.name as dog_name,
  d.breed,
  d.gender,
  d.birth_date,
  d.image_url
FROM profiles p
LEFT JOIN dogs d ON p.id = d.user_id
ORDER BY p.created_at DESC;
