-- profilesテーブルの構造を確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 現在のユーザー情報を確認
SELECT * FROM profiles WHERE email = 'capasjapan@gmail.com';

-- 管理者権限がどこで管理されているかを確認
-- auth.usersテーブルを確認
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'capasjapan@gmail.com'; 