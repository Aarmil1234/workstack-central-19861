-- Drop existing insert policy on chat_rooms
DROP POLICY IF EXISTS "Test allow all" ON chat_rooms;
DROP POLICY IF EXISTS "Admins and HR can create chat rooms" ON chat_rooms;

-- Create policy allowing only admins and HR to create chat rooms
CREATE POLICY "Admins and HR can create chat rooms"
ON chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
  AND auth.uid() = created_by
);