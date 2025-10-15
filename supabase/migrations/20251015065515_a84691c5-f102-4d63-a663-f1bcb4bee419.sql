-- Drop and recreate chat_rooms insert policy to restrict to admins and HR only
DROP POLICY IF EXISTS "Allow authenticated users to create chat rooms" ON chat_rooms;

CREATE POLICY "Admins and HR can create chat rooms"
ON chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'hr'::app_role)
);

-- Fix the room_members SELECT policy - it was checking wrong room_id
DROP POLICY IF EXISTS "Members can view room membership" ON room_members;

CREATE POLICY "Users can view their room memberships"
ON room_members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix chat_rooms SELECT policy to use correct column reference
DROP POLICY IF EXISTS "Members can view rooms they joined" ON chat_rooms;

CREATE POLICY "Members can view rooms they joined"
ON chat_rooms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM room_members
    WHERE room_members.room_id = chat_rooms.id
    AND room_members.user_id = auth.uid()
  )
);

-- Add INSERT policy for notifications
CREATE POLICY "Admins and HR can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'hr'::app_role)
);

-- Add room_code column to notifications table
ALTER TABLE notifications
ADD COLUMN room_code text;