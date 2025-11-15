-- Add foreign key relationship between leave_requests and profiles
ALTER TABLE public.leave_requests
ADD CONSTRAINT fk_leave_requests_user
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;