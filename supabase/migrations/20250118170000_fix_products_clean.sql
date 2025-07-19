-- 商品関連テーブルの修正
-- 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "products_select_all" ON products;
DROP POLICY IF EXISTS "products_admin_write" ON products;
DROP POLICY IF EXISTS "products_select_own" ON products;
DROP POLICY IF EXISTS "products_update_own" ON products;
DROP POLICY IF EXISTS "products_insert_own" ON products;
DROP POLICY IF EXISTS "products_delete_own" ON products;

-- product_imagesテーブルからuser_idポリシーを削除
DROP POLICY IF EXISTS "product_images_select_own" ON product_images;
DROP POLICY IF EXISTS "product_images_update_own" ON product_images;
DROP POLICY IF EXISTS "product_images_insert_own" ON product_images;
DROP POLICY IF EXISTS "product_images_delete_own" ON product_images;

-- RLSを無効化
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- 全てのロールに完全なアクセス権限を付与
GRANT ALL ON products TO authenticated, anon, public;
GRANT ALL ON product_images TO authenticated, anon, public;

-- 既存の商品をアクティブにする
UPDATE products SET is_active = true;

-- 成功メッセージ
SELECT 'Products table policies fixed successfully' as message; 