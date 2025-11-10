-- Create policy to allow anyone to view basic profile info
CREATE POLICY "Allow viewing basic profile info"
ON profiles
FOR SELECT
USING (true);