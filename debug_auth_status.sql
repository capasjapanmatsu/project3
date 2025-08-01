-- 認証状態とセッション情報を確認
SELECT 
  'Current Session Info' as info_type,
  auth.uid() as user_id,
  auth.jwt() as jwt_info;

-- ユーザー情報を確認
SELECT 
  'User Info' as info_type,
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'capasjapan@gmail.com';

-- プロファイル情報を確認
SELECT 
  'Profile Info' as info_type,
  id,
  email,
  is_admin,
  created_at
FROM profiles 
WHERE email = 'capasjapan@gmail.com'; 