-- Add academy_location column to users table if not exists
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we use a workaround: check if column exists first

-- Create a new table with the desired schema
CREATE TABLE IF NOT EXISTS users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  academy_name TEXT,
  academy_location TEXT,
  role TEXT DEFAULT 'user',
  balance INTEGER DEFAULT 0,
  google_id TEXT,
  kakao_id TEXT,
  social_provider TEXT,
  profile_image TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table if it exists
INSERT OR IGNORE INTO users_new (id, email, password, name, phone, academy_name, academy_location, role, balance, google_id, kakao_id, social_provider, profile_image, created_at, updated_at)
SELECT 
  id, email, password, name, phone, academy_name, 
  CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='academy_location') > 0 
    THEN (SELECT academy_location FROM users u2 WHERE u2.id = users.id)
    ELSE NULL 
  END as academy_location,
  role, 
  CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='balance') > 0 
    THEN (SELECT balance FROM users u3 WHERE u3.id = users.id)
    ELSE 0 
  END as balance,
  CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='google_id') > 0 
    THEN (SELECT google_id FROM users u4 WHERE u4.id = users.id)
    ELSE NULL 
  END as google_id,
  CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='kakao_id') > 0 
    THEN (SELECT kakao_id FROM users u5 WHERE u5.id = users.id)
    ELSE NULL 
  END as kakao_id,
  CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='social_provider') > 0 
    THEN (SELECT social_provider FROM users u6 WHERE u6.id = users.id)
    ELSE NULL 
  END as social_provider,
  CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='profile_image') > 0 
    THEN (SELECT profile_image FROM users u7 WHERE u7.id = users.id)
    ELSE NULL 
  END as profile_image,
  created_at,
  CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='updated_at') > 0 
    THEN (SELECT updated_at FROM users u8 WHERE u8.id = users.id)
    ELSE CURRENT_TIMESTAMP 
  END as updated_at
FROM users;

-- Drop old table and rename new table
DROP TABLE IF EXISTS users_old;
ALTER TABLE users RENAME TO users_old;
ALTER TABLE users_new RENAME TO users;

-- Drop the old backup table
DROP TABLE IF EXISTS users_old;

