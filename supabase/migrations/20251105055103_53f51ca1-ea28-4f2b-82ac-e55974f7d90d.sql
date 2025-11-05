-- Enable realtime for work_logs table
ALTER TABLE work_logs REPLICA IDENTITY FULL;

-- Add work_logs to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE work_logs;