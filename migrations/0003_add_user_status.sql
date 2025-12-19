-- Add status column to users table
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';

-- Create index for status column
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
