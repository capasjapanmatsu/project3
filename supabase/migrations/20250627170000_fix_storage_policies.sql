-- Storage policies for vaccine certificates and dog images

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('vaccine-certs', 'vaccine-certs', true),
  ('dog-images', 'dog-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Drop ALL existing policies if they exist
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみアップロード可能" ON storage.objects;
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみ参照可能" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload dog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view dog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update dog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete dog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload dog images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view dog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update dog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete dog images" ON storage.objects;

-- Vaccine certificates storage policies (パブリックアクセス可能)
CREATE POLICY "Authenticated users can upload vaccine certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vaccine-certs');

CREATE POLICY "Public can view vaccine certificates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vaccine-certs');

CREATE POLICY "Authenticated users can update vaccine certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vaccine-certs');

CREATE POLICY "Authenticated users can delete vaccine certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vaccine-certs');

-- Dog images storage policies
CREATE POLICY "Authenticated users can upload dog images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dog-images');

CREATE POLICY "Public can view dog images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'dog-images');

CREATE POLICY "Authenticated users can update dog images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'dog-images');

CREATE POLICY "Authenticated users can delete dog images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'dog-images'); 