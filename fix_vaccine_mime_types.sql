-- Fix vaccine-certs bucket MIME types to include both image/jpeg and image/jpg
-- This ensures maximum compatibility with different browsers and file systems

-- Update the bucket to include both image/jpeg and image/jpg
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',      -- Some browsers/systems use this variant
  'image/png',
  'image/gif',
  'image/webp'
],
public = true,
file_size_limit = 10485760  -- 10MB
WHERE id = 'vaccine-certs';

-- Verify the update
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'vaccine-certs';

-- Also check if there are any RLS policies that might be interfering
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (qual LIKE '%vaccine-certs%' OR with_check LIKE '%vaccine-certs%')
ORDER BY policyname; 