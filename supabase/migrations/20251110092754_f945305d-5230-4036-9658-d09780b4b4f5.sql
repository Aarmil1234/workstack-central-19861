-- Allow users to view all members in rooms they've joined
DROP POLICY IF EXISTS "Users can view their room memberships" ON room_members;

CREATE POLICY "Users can view members in their rooms"
ON room_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
  )
);