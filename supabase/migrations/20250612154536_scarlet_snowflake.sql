/*
  # Product Images Management

  1. New Tables
    - `product_images` - Stores additional product images
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `image_url` (text)
      - `display_order` (integer)
      - `created_at` (timestamptz)
  
  2. Indexes
    - Index on product_id for faster lookups
    - Index on display_order for ordered retrieval
  
  3. Security
    - Enable RLS
    - Admin-only management policy
    - Public view policy for active products
  
  4. Functions
    - get_product_images - Retrieve all images for a product
    - reorder_product_images - Change display order of images
    - delete_product_image - Remove an image
    - set_main_product_image - Set an image as the main product image
*/

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on product_id for faster lookups
CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON product_images(product_id);

-- Create index on display_order for ordered retrieval
CREATE INDEX IF NOT EXISTS product_images_display_order_idx ON product_images(display_order);

-- Enable row level security
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Only admins can manage product images"
  ON product_images
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'capasjapan@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'capasjapan@gmail.com');

-- Create policy for all users to view product images
CREATE POLICY "All users can view product images"
  ON product_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.is_active = true
    )
  );

-- Function to get all images for a product
CREATE OR REPLACE FUNCTION get_product_images(product_id_param uuid)
RETURNS SETOF product_images
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM product_images
  WHERE product_id = product_id_param
  ORDER BY display_order ASC;
$$;

-- Function to reorder product images
CREATE OR REPLACE FUNCTION reorder_product_images(product_id_param uuid, image_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  i integer;
BEGIN
  -- Check if the current user is an admin
  IF NOT (auth.jwt() ->> 'email' = 'capasjapan@gmail.com') THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  -- Update display_order for each image
  FOR i IN 1..array_length(image_ids, 1) LOOP
    UPDATE product_images
    SET display_order = i - 1
    WHERE id = image_ids[i]
    AND product_id = product_id_param;
  END LOOP;
  
  RETURN true;
END;
$$;

-- Function to delete a product image
CREATE OR REPLACE FUNCTION delete_product_image(image_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT (auth.jwt() ->> 'email' = 'capasjapan@gmail.com') THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  -- Delete the image
  DELETE FROM product_images
  WHERE id = image_id_param;
  
  RETURN true;
END;
$$;

-- Function to set a product image as main
CREATE OR REPLACE FUNCTION set_main_product_image(product_id_param uuid, image_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  image_url_val text;
BEGIN
  -- Check if the current user is an admin
  IF NOT (auth.jwt() ->> 'email' = 'capasjapan@gmail.com') THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  -- Get the image URL
  SELECT image_url INTO image_url_val
  FROM product_images
  WHERE id = image_id_param AND product_id = product_id_param;
  
  IF image_url_val IS NULL THEN
    RAISE EXCEPTION 'Image not found';
  END IF;
  
  -- Get the current main image URL
  DECLARE
    current_main_url text;
  BEGIN
    SELECT image_url INTO current_main_url
    FROM products
    WHERE id = product_id_param;
    
    -- If there's a current main image, add it to product_images
    IF current_main_url IS NOT NULL AND current_main_url != '' THEN
      INSERT INTO product_images (
        product_id,
        image_url,
        display_order
      )
      VALUES (
        product_id_param,
        current_main_url,
        (SELECT COALESCE(MAX(display_order), 0) + 1 FROM product_images WHERE product_id = product_id_param)
      );
    END IF;
  END;
  
  -- Update the product's main image
  UPDATE products
  SET image_url = image_url_val
  WHERE id = product_id_param;
  
  -- Delete the image from product_images
  DELETE FROM product_images
  WHERE id = image_id_param;
  
  RETURN true;
END;
$$;