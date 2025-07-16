-- profiles テーブルの内容を確認
SELECT 
  id,
  name,
  postal_code,
  address,
  phone_number,
  email,
  user_type,
  created_at
FROM profiles
WHERE user_type = 'owner' OR user_type = 'admin'
ORDER BY created_at DESC
LIMIT 10;

-- dog_parks テーブルの owner_id を確認
SELECT 
  id,
  name,
  owner_id,
  status,
  created_at
FROM dog_parks
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 5; 