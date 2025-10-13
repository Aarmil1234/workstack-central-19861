-- Drop existing policies on profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- SELECT: Everyone authenticated can view all profiles (company directory)
CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
USING (true);

-- INSERT: Only allow system to insert (via trigger on user creation)
CREATE POLICY "System can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update own profile, admins and HR can update any profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "HR can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'hr'::app_role));

-- DELETE: Only admins can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));