/*
  # Fix Storage RLS Policies for Dog Park Images

  1. Storage Policies
    - Enable RLS on dog-park-images bucket
    - Add policy for park owners to upload images to their own parks
    - Add policy for park owners to update images for their own parks
    - Add policy for park owners to delete images for their own parks
    - Add policy for authenticated users to view approved park images

  2. Security
    - Restrict upload/update/delete operations to park owners only
    - Allow public read access for approved parks
    - Ensure proper path-based security using park ownership
*/

-- Enable RLS on the dog-park-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dog-park-images',
  'dog-park-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Policy for park owners to upload images to their own parks
CREATE POLICY "Park owners can upload images to their parks"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dog-park-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM dog_parks
    WHERE owner_id = auth.uid()
  )
);

-- Policy for park owners to update images for their own parks
CREATE POLICY "Park owners can update images for their parks"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dog-park-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM dog_parks
    WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'dog-park-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM dog_parks
    WHERE owner_id = auth.uid()
  )
);

-- Policy for park owners to delete images for their own parks
CREATE POLICY "Park owners can delete images for their parks"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dog-park-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM dog_parks
    WHERE owner_id = auth.uid()
  )
);

-- Policy for public read access to approved park images
CREATE POLICY "Public can view approved park images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'dog-park-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM dog_parks
    WHERE status = 'approved'
  )
);

-- Policy for authenticated users to view all park images (for owners and admins)
CREATE POLICY "Authenticated users can view park images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'dog-park-images' AND
  (
    -- Park owners can see their own park images regardless of status
    (storage.foldername(name))[1] IN (
      SELECT id::text
      FROM dog_parks
      WHERE owner_id = auth.uid()
    )
    OR
    -- Admins can see all park images
    (auth.jwt() ->> 'email') = 'capasjapan@gmail.com'
    OR
    -- Everyone can see approved park images
    (storage.foldername(name))[1] IN (
      SELECT id::text
      FROM dog_parks
      WHERE status = 'approved'
    )
  )
);