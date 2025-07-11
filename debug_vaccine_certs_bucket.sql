-- Debug vaccine-certs bucket configuration
-- Run this in Supabase SQL Editor to diagnose the current state

-- Check if vaccine-certs bucket exists and its configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets 
WHERE id = 'vaccine-certs';

-- Check all existing policies for vaccine-certs bucket
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
AND (qual LIKE '%vaccine-certs%' OR with_check LIKE '%vaccine-certs%')
ORDER BY policyname;

-- Check RLS status on storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check permissions on storage.objects
SELECT 
  table_schema,
  table_name,
  privilege_type,
  grantee,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'storage' AND table_name = 'objects'
ORDER BY grantee, privilege_type;

-- Check if there are any files in vaccine-certs bucket
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata->>'size' as file_size,
  metadata->>'mimetype' as mime_type
FROM storage.objects 
WHERE bucket_id = 'vaccine-certs'
ORDER BY created_at DESC
LIMIT 10;

-- Test current user authentication
SELECT 
  current_user,
  session_user,
  auth.uid() as auth_uid,
  auth.role() as auth_role;

-- Show all buckets for comparison
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
ORDER BY id; 