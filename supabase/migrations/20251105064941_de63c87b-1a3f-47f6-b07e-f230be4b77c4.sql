-- Make all storage buckets public
UPDATE storage.buckets
SET public = true
WHERE id IN ('documents', 'profile_pictures');