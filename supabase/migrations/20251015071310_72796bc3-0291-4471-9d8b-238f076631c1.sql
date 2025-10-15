-- Drop existing insert policy on chat_rooms
DROP POLICY IF EXISTS "Admins and HR can create chat rooms" ON chat_rooms;

-- Create test policy allowing all authenticated users to insert
CREATE POLICY "Test allow all"
ON chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (true);