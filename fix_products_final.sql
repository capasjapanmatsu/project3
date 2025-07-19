-- 商品関連のテーブルのRLSを完全に無効化
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;

DROP POLICY IF EXISTS "product_images_select_policy" ON product_images;
DROP POLICY IF EXISTS "product_images_insert_policy" ON product_images;
DROP POLICY IF EXISTS "product_images_update_policy" ON product_images;
DROP POLICY IF EXISTS "product_images_delete_policy" ON product_images;

-- 全てのロールに完全なアクセス権限を付与
GRANT ALL ON products TO authenticated, anon, public;
GRANT ALL ON product_images TO authenticated, anon, public;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, public;

-- 既存の商品をアクティブにする
UPDATE products SET is_active = true WHERE is_active = false;

-- 商品テーブルの構造を確認
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- 現在の商品数を確認
SELECT COUNT(*) as total_products, COUNT(*) FILTER (WHERE is_active = true) as active_products FROM products; 