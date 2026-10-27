-- Store logo path
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_path text;

GRANT UPDATE (logo_path) ON public.stores TO authenticated;

-- Public logo bucket: publicly viewable, owner-controlled uploads.
INSERT INTO storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('store-logos', 'store-logos', true, 2097152,
   ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Only the store owner can manage files under that store's UUID folder.
DROP POLICY IF EXISTS store_logos_select_owner ON storage.objects;
CREATE POLICY store_logos_select_owner
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'store-logos'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND public.has_store_role(s.id, ARRAY['owner'])
  )
);

DROP POLICY IF EXISTS store_logos_insert_owner ON storage.objects;
CREATE POLICY store_logos_insert_owner
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'store-logos'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND public.has_store_role(s.id, ARRAY['owner'])
  )
);

DROP POLICY IF EXISTS store_logos_update_owner ON storage.objects;
CREATE POLICY store_logos_update_owner
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'store-logos'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND public.has_store_role(s.id, ARRAY['owner'])
  )
)
WITH CHECK (
  bucket_id = 'store-logos'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND public.has_store_role(s.id, ARRAY['owner'])
  )
);

DROP POLICY IF EXISTS store_logos_delete_owner ON storage.objects;
CREATE POLICY store_logos_delete_owner
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'store-logos'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND public.has_store_role(s.id, ARRAY['owner'])
  )
);