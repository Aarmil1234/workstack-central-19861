-- Fix: Allow authenticated users to view rooms to enable joining via room code
-- Previously, users could only see rooms they created or already joined
-- This prevented joining new rooms via room code

CREATE POLICY "Authenticated users can view all rooms"
ON chat_rooms FOR SELECT
TO authenticated
USING (true);