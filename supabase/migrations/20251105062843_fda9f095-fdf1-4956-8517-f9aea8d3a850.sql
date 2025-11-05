-- Add foreign key constraints for user_id columns
ALTER TABLE work_logs
ADD CONSTRAINT fk_work_logs_user
FOREIGN KEY (user_id)
REFERENCES profiles (id)
ON DELETE CASCADE;

ALTER TABLE room_members
ADD CONSTRAINT fk_room_members_user
FOREIGN KEY (user_id)
REFERENCES profiles (id)
ON DELETE CASCADE;