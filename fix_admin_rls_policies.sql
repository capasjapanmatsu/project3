-- 管理者機能のデバッグ用：一時的にRLSポリシーを無効化
-- 注意：本番環境では使用しないこと

-- 既存のポリシーを一時的に削除
DROP POLICY IF EXISTS "Admins can view all facilities" ON pet_facilities;
DROP POLICY IF EXISTS "Admins can view all facility images" ON facility_images;

-- 管理者に全権限を与える新しいポリシーを作成
CREATE POLICY "Admins full access facilities" ON pet_facilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins full access facility images" ON facility_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- profilesテーブルのポリシーも確認
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 現在ログイン中のユーザーの情報を確認するクエリ
SELECT 
  auth.uid() as current_user_id,
  (SELECT user_type FROM profiles WHERE id = auth.uid()) as user_type,
  (SELECT name FROM profiles WHERE id = auth.uid()) as user_name;
