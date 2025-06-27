/*
  # Add SKU field to products table

  1. New Fields
    - `sku` (text) - Stock Keeping Unit identifier for products
  
  2. Changes
    - Add SKU field to products table
    - Add unique constraint on SKU field
    - Add index on SKU field for faster lookups
*/

-- Add SKU field to products table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE products ADD COLUMN sku text;
  END IF;
END
$$;

-- Add unique constraint on SKU field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_sku_key'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_sku_key UNIQUE (sku);
  END IF;
END
$$;

-- Add index on SKU field for faster lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'products_sku_idx'
  ) THEN
    CREATE INDEX products_sku_idx ON products(sku);
  END IF;
END
$$;

-- Update function to include SKU in product management
CREATE OR REPLACE FUNCTION admin_get_products()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price integer,
  category text,
  image_url text,
  stock_quantity integer,
  is_active boolean,
  weight integer,
  size text,
  brand text,
  ingredients text,
  age_group text,
  dog_size text,
  sku text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id, name, description, price, category, image_url, 
    stock_quantity, is_active, weight, size, brand, 
    ingredients, age_group, dog_size, sku, created_at, updated_at
  FROM products
  ORDER BY created_at DESC;
$$;

-- Function to export products to CSV with SKU
CREATE OR REPLACE FUNCTION admin_export_products_csv()
RETURNS TABLE (
  id text,
  name text,
  sku text,
  price text,
  stock_quantity text,
  category text,
  brand text,
  is_active text,
  created_at text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id::text,
    name,
    COALESCE(sku, ''),
    price::text,
    stock_quantity::text,
    category,
    COALESCE(brand, ''),
    CASE WHEN is_active THEN 'Yes' ELSE 'No' END,
    to_char(created_at, 'YYYY-MM-DD HH24:MI:SS')
  FROM products
  ORDER BY created_at DESC;
$$;