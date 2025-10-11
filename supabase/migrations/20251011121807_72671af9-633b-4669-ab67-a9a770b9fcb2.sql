-- Create Documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Allow users to view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all documents
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to upload documents
CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete documents
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);