-- Force fix vaccine-certs bucket and policies
-- This migration ensures the vaccine-certs bucket is properly configured

-- Step 1: Force update vaccine-certs bucket to public
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 10485760, -- 10MB limit
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'vaccine-certs';

-- Step 2: If bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('vaccine-certs', 'vaccine-certs', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Step 3: Drop ALL existing conflicting policies
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみアップロード可能" ON storage.objects;
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみ参照可能" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Public can view vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "vaccine_certs_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "vaccine_certs_view_policy" ON storage.objects;
DROP POLICY IF EXISTS "vaccine_certs_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "vaccine_certs_delete_policy" ON storage.objects;

-- Step 4: Create new, clean policies for vaccine-certs
CREATE POLICY "vaccine_certs_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vaccine-certs');

CREATE POLICY "vaccine_certs_view_policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vaccine-certs');

CREATE POLICY "vaccine_certs_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vaccine-certs');

CREATE POLICY "vaccine_certs_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vaccine-certs');

-- Step 5: Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 6: Grant necessary permissions to authenticated users
GRANT SELECT ON storage.objects TO authenticated;
GRANT INSERT ON storage.objects TO authenticated;
GRANT UPDATE ON storage.objects TO authenticated;
GRANT DELETE ON storage.objects TO authenticated;

-- Step 7: Log success
DO $$
BEGIN
  RAISE NOTICE 'Force fix vaccine-certs bucket completed successfully';
  RAISE NOTICE 'Bucket is now public: %', (SELECT public FROM storage.buckets WHERE id = 'vaccine-certs');
END $$; 