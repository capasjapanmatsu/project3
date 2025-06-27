/*
  # Fix storage policies for vaccine certificates

  1. Storage Setup
    - Ensure vaccine-certs bucket exists
    - Drop existing policies to avoid conflicts
    - Create new policies for vaccine certificate uploads

  2. Security
    - Users can only access vaccine certificates for dogs they own
    - Policies check dog ownership through the dogs table
*/

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vaccine-certs', 'vaccine-certs', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload vaccine certificates for their dogs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view vaccine certificates for their dogs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update vaccine certificates for their dogs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vaccine certificates for their dogs" ON storage.objects;
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみアップロード可能" ON storage.objects;
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみ参照可能" ON storage.objects;

-- Policy to allow authenticated users to upload vaccine certificates
CREATE POLICY "Users can upload vaccine certificates for their dogs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vaccine-certs' 
  AND (storage.foldername(name))[1] IN (
    SELECT dogs.id::text 
    FROM dogs 
    WHERE dogs.owner_id = auth.uid()
  )
);

-- Policy to allow authenticated users to view their own vaccine certificates
CREATE POLICY "Users can view vaccine certificates for their dogs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'vaccine-certs' 
  AND (storage.foldername(name))[1] IN (
    SELECT dogs.id::text 
    FROM dogs 
    WHERE dogs.owner_id = auth.uid()
  )
);

-- Policy to allow authenticated users to update their own vaccine certificates
CREATE POLICY "Users can update vaccine certificates for their dogs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vaccine-certs' 
  AND (storage.foldername(name))[1] IN (
    SELECT dogs.id::text 
    FROM dogs 
    WHERE dogs.owner_id = auth.uid()
  )
);

-- Policy to allow authenticated users to delete their own vaccine certificates
CREATE POLICY "Users can delete vaccine certificates for their dogs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'vaccine-certs' 
  AND (storage.foldername(name))[1] IN (
    SELECT dogs.id::text 
    FROM dogs 
    WHERE dogs.owner_id = auth.uid()
  )
);