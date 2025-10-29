-- Drop existing policy
DROP POLICY IF EXISTS "Admins and HR can create chat rooms" ON chat_rooms;

-- Recreate policy
CREATE POLICY "Admins and HR can create chat rooms"
ON chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'))
  AND (auth.uid() = created_by)
);

-- Replace has_role function with correct table join
CREATE OR REPLACE FUNCTION has_role(uid uuid, role_name text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = uid
      AND r.name = role_name
  );
$$ LANGUAGE sql STABLE;