-- ✅ Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 🧹 Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

------------------------------------------------------------
-- 🚀 PROFILES TABLE RLS POLICIES
------------------------------------------------------------

-- 1️⃣  Anyone authenticated can SELECT profiles (view directory)
CREATE POLICY "Anyone authenticated can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- 2️⃣  Users can view their own profile (more restrictive fallback)
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 3️⃣  Users can update only their own profile
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4️⃣  Allow authenticated users (like signup triggers) to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 5️⃣  Admins can manage all profiles (CRUD)
CREATE POLICY "Admins can manage all profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

------------------------------------------------------------
-- 🚀 USER_ROLES TABLE RLS POLICIES
------------------------------------------------------------

-- 1️⃣  Only admins can manage all roles
CREATE POLICY "Admins can manage all user_roles"
ON user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- 2️⃣  Users can view their own role
CREATE POLICY "Users can view their own role"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

------------------------------------------------------------
-- ✅ Double-check: Enable RLS again to ensure active
------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
