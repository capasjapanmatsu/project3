-- 商品データの状態を確認
SELECT 
    id,
    name,
    price,
    category,
    is_active,
    stock_quantity,
    created_at
FROM products 
ORDER BY created_at DESC;

-- 商品テーブルの構造を確認
\d products;

-- 商品画像テーブルの構造を確認
\d product_images;

-- 商品画像データも確認
SELECT * FROM product_images; 