/*
  # Create dog park images table

  1. New Tables
    - `dog_park_images` - Stores multiple images for each dog park
      - `id` (uuid, primary key)
      - `park_id` (uuid, foreign key to dog_parks)
      - `image_url` (text)
      - `caption` (text, optional)
      - `display_order` (integer)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `dog_park_images` table
    - Add policy for park owners to manage their park images
    - Add policy for authenticated users to view park images
*/

-- Create table for dog park images
CREATE TABLE IF NOT EXISTS dog_park_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id uuid NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on park_id for faster lookups
CREATE INDEX IF NOT EXISTS dog_park_images_park_id_idx ON dog_park_images(park_id);

-- Create index on display_order for ordered retrieval
CREATE INDEX IF NOT EXISTS dog_park_images_display_order_idx ON dog_park_images(display_order);

-- Enable row level security
ALTER TABLE dog_park_images ENABLE ROW LEVEL SECURITY;

-- Create policy for park owners to manage their park images
CREATE POLICY "Park owners can manage their park images"
  ON dog_park_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dog_parks
      WHERE dog_parks.id = dog_park_images.park_id
      AND dog_parks.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dog_parks
      WHERE dog_parks.id = dog_park_images.park_id
      AND dog_parks.owner_id = auth.uid()
    )
  );

-- Create policy for authenticated users to view park images
CREATE POLICY "Authenticated users can view park images"
  ON dog_park_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dog_parks
      WHERE dog_parks.id = dog_park_images.park_id
      AND dog_parks.status = 'approved'
    )
  );

-- Function to get all images for a dog park
CREATE OR REPLACE FUNCTION get_park_images(park_id_param uuid)
RETURNS SETOF dog_park_images
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM dog_park_images
  WHERE park_id = park_id_param
  ORDER BY display_order ASC;
$$;

-- Insert sample images for existing parks
DO $$
DECLARE
  park_record RECORD;
  image_count INTEGER;
  sample_images TEXT[] := ARRAY[
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg',
    'https://images.pexels.com/photos/1633522/pexels-photo-1633522.jpeg',
    'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg',
    'https://images.pexels.com/photos/2607544/pexels-photo-2607544.jpeg',
    'https://images.pexels.com/photos/3361739/pexels-photo-3361739.jpeg',
    'https://images.pexels.com/photos/3628100/pexels-photo-3628100.jpeg',
    'https://images.pexels.com/photos/3726314/pexels-photo-3726314.jpeg',
    'https://images.pexels.com/photos/4587971/pexels-photo-4587971.jpeg',
    'https://images.pexels.com/photos/5731866/pexels-photo-5731866.jpeg'
  ];
  sample_captions TEXT[] := ARRAY[
    '施設全景',
    '入口',
    '大型犬エリア',
    '小型犬エリア',
    'プライベートブース',
    '休憩スペース',
    'シャワー設備',
    'アジリティ設備',
    '給水設備',
    '駐車場'
  ];
BEGIN
  -- Loop through all approved parks
  FOR park_record IN 
    SELECT id, name FROM dog_parks 
    WHERE status = 'approved'
  LOOP
    -- Check if park already has images
    SELECT COUNT(*) INTO image_count FROM dog_park_images WHERE park_id = park_record.id;
    
    -- If no images, add sample images
    IF image_count = 0 THEN
      -- Add 3-8 random images per park
      FOR i IN 1..LEAST(5 + floor(random() * 5)::int, array_length(sample_images, 1)) LOOP
        INSERT INTO dog_park_images (
          park_id,
          image_url,
          caption,
          display_order
        ) VALUES (
          park_record.id,
          sample_images[i],
          park_record.name || ' - ' || sample_captions[i],
          i
        );
      END LOOP;
    END IF;
  END LOOP;
END $$;