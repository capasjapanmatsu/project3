/*
  # Storage Buckets and Policies for Dog Park Application

  1. New Buckets
    - `dog-park-images` - For storing images of dog parks
    - `dog-images` - For storing dog profile pictures
    - `vaccine-certs` - For storing vaccine certification documents
  
  2. Security
    - Enable RLS on storage.objects table
    - Create policies for each bucket to control access
    - Fix SPLIT_PART function usage with proper casting
*/

-- Create the dog-park-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dog-park-images',
  'dog-park-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create the dog-images bucket for dog profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dog-images',
  'dog-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create the vaccine-certs bucket for vaccine certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vaccine-certs',
  'vaccine-certs',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on objects table
DO $$
BEGIN
  -- Check if RLS is already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND rowsecurity = true
  ) THEN
    -- Enable row level security
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Create policies for dog-park-images bucket
DO $$
BEGIN
  -- Public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Dog Park Images Public Access'
  ) THEN
    CREATE POLICY "Dog Park Images Public Access"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'dog-park-images');
  END IF;

  -- Authenticated users can upload images for their own parks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Dog Park Images Upload Access'
  ) THEN
    CREATE POLICY "Dog Park Images Upload Access"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'dog-park-images' AND
        EXISTS (
          SELECT 1 FROM public.dog_parks 
          WHERE id::text = SPLIT_PART(name::text, '/', 1) 
          AND owner_id = auth.uid()
        )
      );
  END IF;

  -- Authenticated users can update images for their own parks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Dog Park Images Update Access'
  ) THEN
    CREATE POLICY "Dog Park Images Update Access"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'dog-park-images' AND
        EXISTS (
          SELECT 1 FROM public.dog_parks 
          WHERE id::text = SPLIT_PART(name::text, '/', 1) 
          AND owner_id = auth.uid()
        )
      );
  END IF;

  -- Authenticated users can delete images for their own parks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Dog Park Images Delete Access'
  ) THEN
    CREATE POLICY "Dog Park Images Delete Access"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'dog-park-images' AND
        EXISTS (
          SELECT 1 FROM public.dog_parks 
          WHERE id::text = SPLIT_PART(name::text, '/', 1) 
          AND owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create policies for dog-images bucket
DO $$
BEGIN
  -- Public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Dog Images Public Access'
  ) THEN
    CREATE POLICY "Dog Images Public Access"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'dog-images');
  END IF;

  -- Authenticated users can upload images for their own dogs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Dog Images Upload Access'
  ) THEN
    CREATE POLICY "Dog Images Upload Access"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'dog-images' AND
        EXISTS (
          SELECT 1 FROM public.dogs 
          WHERE id::text = SPLIT_PART(name::text, '/', 1) 
          AND owner_id = auth.uid()
        )
      );
  END IF;

  -- Authenticated users can update images for their own dogs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Dog Images Update Access'
  ) THEN
    CREATE POLICY "Dog Images Update Access"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'dog-images' AND
        EXISTS (
          SELECT 1 FROM public.dogs 
          WHERE id::text = SPLIT_PART(name::text, '/', 1) 
          AND owner_id = auth.uid()
        )
      );
  END IF;

  -- Authenticated users can delete images for their own dogs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Dog Images Delete Access'
  ) THEN
    CREATE POLICY "Dog Images Delete Access"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'dog-images' AND
        EXISTS (
          SELECT 1 FROM public.dogs 
          WHERE id::text = SPLIT_PART(name::text, '/', 1) 
          AND owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create policies for vaccine-certs bucket
DO $$
BEGIN
  -- Public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Vaccine Certs Public Access'
  ) THEN
    CREATE POLICY "Vaccine Certs Public Access"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'vaccine-certs');
  END IF;

  -- Authenticated users can upload vaccine certs for their own dogs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Vaccine Certs Upload Access'
  ) THEN
    CREATE POLICY "Vaccine Certs Upload Access"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'vaccine-certs' AND
        EXISTS (
          SELECT 1 FROM public.dogs 
          WHERE id::text = SPLIT_PART(name::text, '/', 1) 
          AND owner_id = auth.uid()
        )
      );
  END IF;

  -- Authenticated users can update vaccine certs for their own dogs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Vaccine Certs Update Access'
  ) THEN
    CREATE POLICY "Vaccine Certs Update Access"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'vaccine-certs' AND
        EXISTS (
          SELECT 1 FROM public.dogs 
          WHERE id::text = SPLIT_PART(name::text, '/', 1) 
          AND owner_id = auth.uid()
        )
      );
  END IF;

  -- Authenticated users can delete vaccine certs for their own dogs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Vaccine Certs Delete Access'
  ) THEN
    CREATE POLICY "Vaccine Certs Delete Access"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'vaccine-certs' AND
        EXISTS (
          SELECT 1 FROM public.dogs 
          WHERE id::text = SPLIT_PART(name::text, '/', 1) 
          AND owner_id = auth.uid()
        )
      );
  END IF;
END $$;