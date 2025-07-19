-- 最終的な商品テーブルRLS修正
-- 他のマイグレーションで再度有効化されるのを防ぐため、最新のタイムスタンプで実行

-- 現在のRLS状態を確認
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('products', 'product_images');

-- 既存のポリシーを全て削除
DROP POLICY IF EXISTS "products_select_all" ON products;
DROP POLICY IF EXISTS "products_admin_write" ON products;
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_admin_manage" ON products;
DROP POLICY IF EXISTS "products_select_own" ON products;
DROP POLICY IF EXISTS "products_insert_own" ON products;
DROP POLICY IF EXISTS "products_update_own" ON products;
DROP POLICY IF EXISTS "products_delete_own" ON products;

-- product_imagesのポリシーも削除
DROP POLICY IF EXISTS "product_images_select_own" ON product_images;
DROP POLICY IF EXISTS "product_images_insert_own" ON product_images;
DROP POLICY IF EXISTS "product_images_update_own" ON product_images;
DROP POLICY IF EXISTS "product_images_delete_own" ON product_images;
DROP POLICY IF EXISTS "product_images_public_read" ON product_images;
DROP POLICY IF EXISTS "product_images_admin_write" ON product_images;
DROP POLICY IF EXISTS "product_images_admin_update" ON product_images;
DROP POLICY IF EXISTS "product_images_admin_delete" ON product_images;

-- RLSを強制的に無効化
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- 全てのロールに完全な権限を付与
GRANT ALL PRIVILEGES ON products TO authenticated, anon, public;
GRANT ALL PRIVILEGES ON product_images TO authenticated, anon, public;

-- シーケンスにも権限を付与
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, public;

-- 既存の商品をアクティブにする
UPDATE products SET is_active = true WHERE is_active = false OR is_active IS NULL;

-- 確認用クエリ
SELECT 
    'Products table - RLS status: ' || CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE tablename = 'products';

SELECT 'Products RLS fix completed successfully' as message; 