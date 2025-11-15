-- Add extra_info column to leave_requests table
ALTER TABLE public.leave_requests 
ADD COLUMN extra_info text;