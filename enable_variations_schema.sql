-- バリエーション機能有効化のためのデータベーススキーマ更新

-- 1. productsテーブルに新しいフィールドを追加
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 3;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS has_variations BOOLEAN DEFAULT false;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS variation_type TEXT;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]';

-- 2. cart_itemsテーブルにバリエーションSKUフィールドを追加
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS variation_sku TEXT;

-- 3. 確認クエリ
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('delivery_days', 'has_variations', 'variation_type', 'variations')
ORDER BY column_name;

-- 4. cart_itemsテーブルの確認
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'cart_items' 
AND column_name = 'variation_sku';

SELECT 'バリエーション機能のスキーマ更新完了' as status; 