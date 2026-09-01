/*
# Storage Policies for Background Music Bucket

1. Security
   - The `website-music` bucket is public (read-only for anon/authenticated).
   - Only authenticated users can upload/update/delete.
   - This allows the admin to upload music files while visitors can stream them.
2. Important Notes
   - Bucket `website-music` was created via execute_sql (public bucket).
   - These policies enable fine-grained access control.
*/

-- SELECT (read/download) policy: public can read music files
DROP POLICY IF EXISTS "Public can read music files" ON storage.objects;
CREATE POLICY "Public can read music files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'website-music');

-- INSERT policy: any authenticated user can upload (admin gate enforced in app)
DROP POLICY IF EXISTS "Authenticated can upload music files" ON storage.objects;
CREATE POLICY "Authenticated can upload music files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'website-music');

-- UPDATE policy: authenticated users can update
DROP POLICY IF EXISTS "Authenticated can update music files" ON storage.objects;
CREATE POLICY "Authenticated can update music files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'website-music');

-- DELETE policy: authenticated users can delete
DROP POLICY IF EXISTS "Authenticated can delete music files" ON storage.objects;
CREATE POLICY "Authenticated can delete music files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'website-music');
