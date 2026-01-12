CREATE TABLE IF NOT EXISTS landing_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_landing_folders_user_id ON landing_folders(user_id);

ALTER TABLE landing_pages ADD COLUMN folder_id INTEGER REFERENCES landing_folders(id);

CREATE INDEX IF NOT EXISTS idx_landing_pages_folder_id ON landing_pages(folder_id);
