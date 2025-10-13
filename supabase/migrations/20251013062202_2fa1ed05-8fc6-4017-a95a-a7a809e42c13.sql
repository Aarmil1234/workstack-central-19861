-- Create roles table
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Insert existing roles from enum
INSERT INTO public.roles (name, description) VALUES
  ('admin', 'Administrator with full access'),
  ('hr', 'Human Resources personnel'),
  ('employee', 'Regular employee');

-- Add new column to user_roles referencing roles table
ALTER TABLE public.user_roles ADD COLUMN role_id uuid REFERENCES public.roles(id);

-- Migrate existing data
UPDATE public.user_roles ur
SET role_id = r.id
FROM public.roles r
WHERE ur.role::text = r.name;

-- Make role_id NOT NULL after migration
ALTER TABLE public.user_roles ALTER COLUMN role_id SET NOT NULL;

-- Create new has_role function with text parameter (overloaded)
CREATE OR REPLACE FUNCTION public.has_role_text(_user_id uuid, _role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id AND r.name = _role_name
  )
$$;

-- RLS policies for roles table
CREATE POLICY "Anyone can view roles"
ON public.roles FOR SELECT
USING (true);

CREATE POLICY "Admins can insert roles"
ON public.roles FOR INSERT
WITH CHECK (has_role_text(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.roles FOR UPDATE
USING (has_role_text(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.roles FOR DELETE
USING (has_role_text(auth.uid(), 'admin'));