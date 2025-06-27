/*
  # Fix Storage RLS Policies for Vaccine Certificates

  1. Storage Policies
    - Create storage bucket for vaccine certificates if it doesn't exist
    - Add RLS policies to allow authenticated users to upload vaccine certificate images
    - Add policies for users to read their own uploaded certificates

  2. Security
    - Users can only upload files for their own dogs
    - Users can only read files for their own dogs
    - File paths include dog_id for proper access control
*/

-- Create the vaccine-certs storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('vaccine-certs', 'vaccine-certs', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the vaccine-certs bucket
UPDATE storage.buckets 
SET public = false 
WHERE id = 'vaccine-certs';

-- Policy to allow authenticated users to upload vaccine certificates for their own dogs
CREATE POLICY "Users can upload vaccine certificates for their dogs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vaccine-certs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM dogs 
    WHERE dogs.id::text = (storage.foldername(name))[1] 
    AND dogs.owner_id = auth.uid()
  )
);

-- Policy to allow authenticated users to read vaccine certificates for their own dogs
CREATE POLICY "Users can view vaccine certificates for their dogs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'vaccine-certs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM dogs 
    WHERE dogs.id::text = (storage.foldername(name))[1] 
    AND dogs.owner_id = auth.uid()
  )
);

-- Policy to allow authenticated users to update vaccine certificates for their own dogs
CREATE POLICY "Users can update vaccine certificates for their dogs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vaccine-certs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM dogs 
    WHERE dogs.id::text = (storage.foldername(name))[1] 
    AND dogs.owner_id = auth.uid()
  )
);

-- Policy to allow authenticated users to delete vaccine certificates for their own dogs
CREATE POLICY "Users can delete vaccine certificates for their dogs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'vaccine-certs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM dogs 
    WHERE dogs.id::text = (storage.foldername(name))[1] 
    AND dogs.owner_id = auth.uid()
  )
);