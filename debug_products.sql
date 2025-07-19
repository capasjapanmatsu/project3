-- 商品テーブルの存在確認
SELECT table_name FROM information_schema.tables WHERE table_name = 'products';

-- 商品数の確認
SELECT COUNT(*) as total_products FROM products;

-- 商品データの確認（最大10件）
SELECT id, name, price, category, is_active, stock_quantity, created_at 
FROM products 
ORDER BY created_at DESC 
LIMIT 10;

-- アクティブな商品の確認
SELECT COUNT(*) as active_products FROM products WHERE is_active = true;

-- 商品テーブルの構造確認
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position; 