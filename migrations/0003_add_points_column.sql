-- Add points column to users table
ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0;

-- Update existing users to have 0 points
UPDATE users SET points = 0 WHERE points IS NULL;
