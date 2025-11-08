-- Drop unique constraint to allow multiple work logs per user per day in same room
ALTER TABLE work_logs DROP CONSTRAINT IF EXISTS work_logs_user_id_room_id_log_date_key;