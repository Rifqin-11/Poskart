-- ============================================================
-- Create the builder-assets Storage bucket
-- ============================================================
-- This bucket holds images and videos uploaded through the
-- visual builder (canvas backgrounds, node images, etc.).
-- ============================================================

-- 1. Create the bucket (public = files are accessible without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'builder-assets',
  'builder-assets',
  true,
  209715200,  -- 200 MB (covers video uploads)
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies for the bucket
--    • Authenticated users can upload/update/delete (admin panel)
--    • Public can read (Flutter app fetches assets without auth)

-- Allow public read
CREATE POLICY "builder-assets: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'builder-assets');

-- Allow authenticated upload
CREATE POLICY "builder-assets: auth upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'builder-assets');

-- Allow authenticated update
CREATE POLICY "builder-assets: auth update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'builder-assets');

-- Allow authenticated delete
CREATE POLICY "builder-assets: auth delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'builder-assets');
