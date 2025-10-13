-- Allow Admins and HR to insert profiles
create policy "Admins and HR can insert profiles"
on profiles
for insert
to authenticated
using (exists (
  select 1 from user_roles
  where user_roles.user_id = auth.uid()
  and user_roles.role in ('admin', 'hr')
))
with check (true);
