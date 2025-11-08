-- Add time tracking columns to work_logs table
ALTER TABLE work_logs
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;