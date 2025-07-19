-- 管理者ユーザーのuser_typeを修正
UPDATE profiles 
SET user_type = 'admin' 
WHERE email = 'capasjapan@gmail.com';

-- profilesテーブルの存在確認とuser_typeカラムの確認
SELECT id, email, user_type, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- profilesテーブルにRLSポリシーが存在する場合、一時的に無効化
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- profilesテーブルの構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position; 