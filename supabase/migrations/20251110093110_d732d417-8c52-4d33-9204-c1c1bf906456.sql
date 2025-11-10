-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view members in their rooms" ON room_members;

-- Create a function to check if user is room member (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_room_member(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM room_members
    WHERE user_id = _user_id AND room_id = _room_id
  )
$$;

-- Create new policies without recursion
CREATE POLICY "Users can view their own memberships"
ON room_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view other members in their rooms"
ON room_members
FOR SELECT
USING (is_room_member(auth.uid(), room_id));