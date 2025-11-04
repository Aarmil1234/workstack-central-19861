-- Drop the existing policy
DROP POLICY IF EXISTS "Admins and HR can create chat rooms" ON chat_rooms;

-- Recreate with explicit text casting to avoid function overload ambiguity
CREATE POLICY "Admins and HR can create chat rooms"
ON chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::text) OR has_role(auth.uid(), 'hr'::text))
  AND (auth.uid() = created_by)
);