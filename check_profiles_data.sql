-- profiles テーブルの内容を確認
SELECT 
  id,
  user_type,
  name,
  postal_code,
  address,
  phone_number,
  email,
  created_at
FROM profiles
WHERE user_type = 'owner' OR user_type = 'admin'
ORDER BY created_at DESC;

-- dog_parks テーブルの owner_id を確認
SELECT 
  dp.id,
  dp.name,
  dp.owner_id,
  dp.status,
  dp.created_at,
  p.name as owner_name,
  p.address as owner_address,
  p.postal_code as owner_postal_code,
  p.phone_number as owner_phone_number,
  p.email as owner_email
FROM dog_parks dp
LEFT JOIN profiles p ON dp.owner_id = p.id
WHERE dp.status = 'pending'
ORDER BY dp.created_at DESC;

-- auth.users テーブルの情報も確認
SELECT 
  au.id,
  au.email,
  au.created_at,
  p.name,
  p.address,
  p.postal_code,
  p.phone_number,
  p.user_type
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email IS NOT NULL
ORDER BY au.created_at DESC
LIMIT 10; 