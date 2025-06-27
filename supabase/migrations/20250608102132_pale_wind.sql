/*
  # Create pet shop tables

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text, not null)
      - `price` (integer, not null)
      - `category` (text, not null)
      - `image_url` (text, not null)
      - `stock_quantity` (integer, default 0)
      - `is_active` (boolean, default true)
      - `weight` (integer, nullable)
      - `size` (text, nullable)
      - `brand` (text, nullable)
      - `ingredients` (text, nullable)
      - `age_group` (text, nullable)
      - `dog_size` (text, nullable)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)
    
    - `cart_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null, foreign key to profiles)
      - `product_id` (uuid, not null, foreign key to products)
      - `quantity` (integer, default 1)
      - `created_at` (timestamptz, default now)

  2. Security
    - Enable RLS on both tables
    - Products: authenticated users can read active products
    - Cart items: users can only access their own cart items

  3. Sample Data
    - Insert sample products for testing
*/

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price integer NOT NULL,
  category text NOT NULL,
  image_url text NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  weight integer,
  size text,
  brand text,
  ingredients text,
  age_group text,
  dog_size text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints for products (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_price_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_price_check CHECK (price >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_stock_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_stock_check CHECK (stock_quantity >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_category_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_category_check 
      CHECK (category = ANY (ARRAY['food'::text, 'treats'::text, 'toys'::text, 'accessories'::text, 'health'::text, 'sheets'::text]));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_age_group_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_age_group_check 
      CHECK (age_group = ANY (ARRAY['puppy'::text, 'adult'::text, 'senior'::text, 'all'::text]));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_dog_size_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_dog_size_check 
      CHECK (dog_size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text, 'all'::text]));
  END IF;
END $$;

-- Create cart_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cart_items_user_id_fkey'
  ) THEN
    ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cart_items_product_id_fkey'
  ) THEN
    ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_id_fkey 
      FOREIGN KEY (product_id) REFERENCES products(id);
  END IF;
END $$;

-- Add constraints for cart_items (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cart_items_quantity_check'
  ) THEN
    ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_check CHECK (quantity > 0);
  END IF;
END $$;

-- Create unique index for user_id + product_id (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'cart_items_user_product_unique'
  ) THEN
    CREATE UNIQUE INDEX cart_items_user_product_unique 
      ON cart_items (user_id, product_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for products (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "商品は誰でも参照可能" ON products;
CREATE POLICY "商品は誰でも参照可能"
  ON products
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS policies for cart_items (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "カートは本人のみ操作可能" ON cart_items;
CREATE POLICY "カートは本人のみ操作可能"
  ON cart_items
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create or replace trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to products table (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_products_updated_at'
  ) THEN
    CREATE TRIGGER update_products_updated_at
      BEFORE UPDATE ON products
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert sample products (only if table is empty)
INSERT INTO products (name, description, price, category, image_url, stock_quantity, weight, brand, age_group, dog_size)
SELECT * FROM (VALUES
  ('プレミアムドッグフード（チキン）', '新鮮なチキンを主原料とした栄養バランスの取れたドッグフードです。愛犬の健康をサポートする高品質な原材料のみを使用しています。', 3980, 'food', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', 50, 2000, 'PetNutrition', 'adult', 'all'),
  ('天然素材おやつ（ささみ）', '国産ささみを使用した無添加のおやつです。トレーニングのご褒美や普段のおやつとして最適です。', 1280, 'treats', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', 100, 100, 'NaturalTreats', 'all', 'all'),
  ('知育玩具ボール', '愛犬の知能を刺激する仕掛けがたくさん詰まった知育玩具です。遊びながら学習能力を向上させます。', 2480, 'toys', 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg', 30, 200, 'SmartToys', 'adult', 'medium'),
  ('おしゃれカラー', 'デザイン性と機能性を兼ね備えたおしゃれなカラーです。散歩が楽しくなること間違いなしです。', 1980, 'accessories', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg', 25, 50, 'StylePet', 'all', 'small'),
  ('関節サポートサプリ', 'シニア犬の関節の健康をサポートするサプリメントです。グルコサミンとコンドロイチンを配合しています。', 4980, 'health', 'https://images.pexels.com/photos/3683107/pexels-photo-3683107.jpeg', 40, 60, 'HealthyPet', 'senior', 'all'),
  ('超吸収ペットシーツ', '優れた吸収力で愛犬の快適な生活をサポートします。消臭効果もあり、お部屋を清潔に保ちます。', 1580, 'sheets', 'https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg', 80, 500, 'CleanLife', 'all', 'all'),
  ('子犬用ミルク', '母乳に近い栄養成分で作られた子犬専用のミルクです。健やかな成長をサポートします。', 2280, 'food', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', 35, 400, 'PuppyNutrition', 'puppy', 'all'),
  ('デンタルケアおやつ', '歯の健康を考えた特別なおやつです。噛むことで歯垢を除去し、口臭を予防します。', 1680, 'treats', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', 60, 150, 'DentalCare', 'adult', 'all')
) AS v(name, description, price, category, image_url, stock_quantity, weight, brand, age_group, dog_size)
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);