-- Script 006: Create Suppliers Storage Bucket
-- This creates the storage bucket for supplier sample PDFs

-- Create the 'suppliers' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'suppliers',
  'suppliers',
  true,  -- Public bucket so URLs work
  10485760,  -- 10MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to make script rerunnable)
DROP POLICY IF EXISTS "Allow authenticated users to upload supplier samples" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update supplier samples" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete supplier samples" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for supplier samples" ON storage.objects;

-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload supplier samples"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'suppliers'
);

-- Policy 2: Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated users to update supplier samples"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'suppliers')
WITH CHECK (bucket_id = 'suppliers');

-- Policy 3: Allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete supplier samples"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'suppliers');

-- Policy 4: Allow public read access to all files in the bucket
CREATE POLICY "Public read access for supplier samples"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'suppliers');

-- Verify the bucket was created
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'suppliers';

-- Display message
DO $$
BEGIN
  RAISE NOTICE 'Suppliers storage bucket created successfully!';
  RAISE NOTICE 'Bucket: suppliers';
  RAISE NOTICE 'Public: Yes';
  RAISE NOTICE 'Max file size: 10MB';
  RAISE NOTICE 'Allowed types: PDF and images';
END $$;
