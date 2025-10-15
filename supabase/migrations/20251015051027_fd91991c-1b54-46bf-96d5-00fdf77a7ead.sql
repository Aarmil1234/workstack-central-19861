-- Update chat_rooms insert policy to allow all authenticated users
DROP POLICY IF EXISTS "Admins and HR can create rooms" ON chat_rooms;

CREATE POLICY "Allow authenticated users to create chat rooms"
ON chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Create profile_pictures bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_pictures', 'profile_pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Update documents bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'documents';

-- RLS policies for documents bucket
CREATE POLICY "Allow list own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid() = owner
);

CREATE POLICY "Allow upload to documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid() = owner
);

CREATE POLICY "Allow delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.uid() = owner
);

-- RLS policies for profile_pictures bucket
-- Allow everyone to view profile pictures (public bucket)
CREATE POLICY "Allow public access to profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_pictures');

-- Allow users to upload their own profile pictures, admins/HR can upload for anyone
CREATE POLICY "Allow users to upload own profile pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile_pictures'
  AND (
    -- Users can upload to their own folder
    auth.uid()::text = (storage.foldername(name))[1]
    -- Admins and HR can upload to any folder
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
  )
);

-- Allow users to update their own profile pictures, admins/HR can update any
CREATE POLICY "Allow users to update own profile pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile_pictures'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
  )
);

-- Allow users to delete their own profile pictures, admins/HR can delete any
CREATE POLICY "Allow users to delete own profile pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile_pictures'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
  )
);