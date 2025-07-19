-- 世界最高クラスのエンジニアによる確実なproductsテーブル作成
-- 顧客が安心して購入できる商品管理システム

-- 1. productsテーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL CHECK (category IN ('food', 'treats', 'toys', 'accessories', 'health', 'sheets', 'business')),
    image_url TEXT DEFAULT '',
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    brand TEXT,
    weight INTEGER CHECK (weight >= 0),
    size TEXT,
    ingredients TEXT,
    age_group TEXT DEFAULT 'all' CHECK (age_group IN ('all', 'puppy', 'adult', 'senior')),
    dog_size TEXT DEFAULT 'all' CHECK (dog_size IN ('all', 'small', 'medium', 'large')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. product_imagesテーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0 AND display_order <= 9),
    alt_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, display_order)
);

-- 3. 両テーブルでRLSを無効化（開発環境用）
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- 4. 全ユーザーに対してテーブルへのアクセス権限を付与
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO anon;
GRANT ALL ON products TO public;

GRANT ALL ON product_images TO authenticated;
GRANT ALL ON product_images TO anon;
GRANT ALL ON product_images TO public;

-- 5. インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- 6. 更新日時の自動更新トリガーを作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. トリガーを適用
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_images_updated_at ON product_images;
CREATE TRIGGER update_product_images_updated_at
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. サンプルデータを挿入（テスト用）
INSERT INTO products (name, description, price, category, stock_quantity, is_active, brand, age_group, dog_size)
VALUES 
    ('プレミアムドッグフード', '高品質な材料で作られた栄養バランスの良いドッグフードです。', 2980, 'food', 50, true, 'PetCare Pro', 'all', 'all'),
    ('ナチュラルトリーツ', '無添加の自然な材料で作られた犬用おやつです。', 1580, 'treats', 30, true, 'Natural Pet', 'all', 'all'),
    ('丈夫なロープおもちゃ', '噛み応えのある丈夫なロープで作られたおもちゃです。', 890, 'toys', 20, true, 'PlayTime', 'all', 'all')
ON CONFLICT (id) DO NOTHING;

-- 9. 確認メッセージ
SELECT 
    'productsテーブルとproduct_imagesテーブルが正常に作成されました。RLSは無効化されており、すべてのユーザーがアクセス可能です。' as status,
    COUNT(*) as sample_products_count
FROM products;

-- 10. テーブル状態の確認
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM products) as products_count
FROM pg_tables 
WHERE tablename = 'products' AND schemaname = 'public'; 