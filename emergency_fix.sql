-- 緊急修正SQL: Supabaseダッシュボードで直接実行してください
-- URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/editor

-- 1. 現在のユーザーを管理者に設定
UPDATE profiles 
SET user_type = 'admin' 
WHERE id = auth.uid();

-- プロフィールが存在しない場合は作成
INSERT INTO profiles (id, user_type, email, name, created_at, updated_at)
SELECT auth.uid(), 'admin', (SELECT email FROM auth.users WHERE id = auth.uid()), 'Administrator', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid());

-- 2. capasjapan@gmail.comも管理者に設定
UPDATE profiles 
SET user_type = 'admin' 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'capasjapan@gmail.com');

-- 3. productsテーブルの全てのRLSポリシーを削除
DROP POLICY IF EXISTS "products_select_all" ON products;
DROP POLICY IF EXISTS "products_admin_write" ON products;
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_admin_manage" ON products;
DROP POLICY IF EXISTS "products_public_select" ON products;
DROP POLICY IF EXISTS "商品は誰でも参照可能" ON products;

-- 4. RLSを無効化
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 5. 権限を付与
GRANT ALL ON products TO authenticated, anon, public;
GRANT ALL ON product_images TO authenticated, anon, public;
GRANT ALL ON profiles TO authenticated, anon, public;

-- 6. 確認
SELECT 'RLS無効化完了' as status; 