-- Migration: Fix academy_id for directors (원장님)
-- Date: 2026-01-23
-- Description: Set academy_id = id for all directors so teachers can share the same academy data

-- Ensure academy_id column exists
-- (This will fail silently if column already exists)
-- ALTER TABLE users ADD COLUMN academy_id INTEGER;

-- Update all directors to have academy_id = their own id
-- This ensures directors and their teachers share the same academy_id
UPDATE users 
SET academy_id = id 
WHERE (role = 'director' OR user_type = 'director') 
  AND (academy_id IS NULL OR academy_id != id);

-- Update all teachers to have academy_id = their director's id
-- This ensures teachers inherit their director's academy_id
UPDATE users 
SET academy_id = parent_user_id
WHERE user_type = 'teacher' 
  AND parent_user_id IS NOT NULL 
  AND (academy_id IS NULL OR academy_id != parent_user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_academy_id ON users(academy_id);
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);

-- Verify the fix
-- SELECT id, email, name, role, user_type, academy_id, parent_user_id FROM users WHERE role IN ('director', 'teacher') OR user_type IN ('director', 'teacher');
