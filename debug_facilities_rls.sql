-- RLSポリシーとfacilitiesテーブルの調査用SQL

-- 1. facilitiesテーブルの全データを確認（RLS無視）
-- 注意: これは管理者権限でSupabaseダッシュボードから実行してください
SELECT 
  id,
  name,
  status,
  owner_id,
  created_at,
  category_id
FROM facilities
ORDER BY created_at DESC;

-- 2. facilitiesテーブルのRLSポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'facilities';

-- 3. profilesテーブルの管理者ユーザーを確認
SELECT 
  id,
  user_type,
  created_at,
  name,
  email
FROM profiles
WHERE user_type = 'admin'
ORDER BY created_at DESC;

-- 4. 現在ログイン中のユーザーの情報を確認（関数として）
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() -> 'email' as current_user_email;

-- 5. 現在のユーザーのプロファイル情報
SELECT 
  id,
  user_type,
  name,
  email,
  created_at
FROM profiles
WHERE id = auth.uid();
