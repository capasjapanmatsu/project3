-- profiles テーブルの全データを確認
SELECT * FROM profiles LIMIT 10;

-- 特定のユーザーのprofilesデータを確認
SELECT 
  p.id,
  p.name,
  p.postal_code,
  p.address,
  p.phone_number,
  p.email,
  p.user_type,
  au.email as auth_email
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.user_type = 'owner'
ORDER BY p.created_at DESC; 