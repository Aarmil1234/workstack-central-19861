-- Fix security issue: Set search_path on has_role function
CREATE OR REPLACE FUNCTION has_role(uid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = uid
      AND r.name = role_name
  );
$$;