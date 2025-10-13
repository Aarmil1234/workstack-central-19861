-- Add policy for Admins and HR to insert profiles
create policy "Admins and HR can insert profiles"
on profiles
for insert
to authenticated
with check (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'hr'::app_role)
);