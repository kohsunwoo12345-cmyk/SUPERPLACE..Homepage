-- Add schedule columns to classes table
ALTER TABLE classes ADD COLUMN schedule_days TEXT;
ALTER TABLE classes ADD COLUMN start_time TEXT;
ALTER TABLE classes ADD COLUMN end_time TEXT;
