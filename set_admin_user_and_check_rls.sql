-- 管理者権限の確認と設定
-- 注意: Supabaseダッシュボードで実行してください

-- 1. 現在のユーザーIDを確認
SELECT auth.uid() as current_user_id;

-- 2. 現在のユーザーのプロファイルを確認
SELECT 
  id,
  user_type,
  name,
  email,
  created_at
FROM profiles
WHERE id = auth.uid();

-- 3. 現在のユーザーを管理者に設定（プロファイルが存在する場合）
UPDATE profiles 
SET user_type = 'admin'
WHERE id = auth.uid();

-- 4. プロファイルが存在しない場合、新規作成
INSERT INTO profiles (id, user_type, created_at)
VALUES (auth.uid(), 'admin', now())
ON CONFLICT (id) 
DO UPDATE SET user_type = 'admin';

-- 5. 設定後の確認
SELECT 
  id,
  user_type,
  name,
  email,
  created_at
FROM profiles
WHERE id = auth.uid();

-- 6. facilitiesテーブルのRLSポリシーを確認
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

-- 7. facilitiesテーブルにRLSが有効かどうか確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'facilities';
