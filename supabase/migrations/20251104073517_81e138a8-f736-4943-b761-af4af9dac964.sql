-- Fix #2: Add SELECT policy for room creators
CREATE POLICY "Creators can view own rooms"
ON chat_rooms FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Fix #1: Replace public profiles policy with authenticated-only access
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins and HR can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::text) OR has_role(auth.uid(), 'hr'::text));

-- Fix #5: Add DELETE policy for documents
CREATE POLICY "Admins and HR can delete documents"
ON documents FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::text) 
  OR has_role(auth.uid(), 'hr'::text)
);

-- Fix #4: Make storage buckets private
UPDATE storage.buckets 
SET public = false 
WHERE name IN ('profile_pictures', 'documents');