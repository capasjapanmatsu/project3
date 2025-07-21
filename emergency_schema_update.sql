-- データベースの新しいフィールドを追加
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 3;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS has_variations BOOLEAN DEFAULT false;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS variation_type TEXT;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]';

ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS variation_sku TEXT;

-- 確認クエリ
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('delivery_days', 'has_variations', 'variation_type', 'variations');

SELECT 'Product schema updated successfully' as status; 