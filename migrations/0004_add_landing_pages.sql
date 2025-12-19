-- 랜딩페이지 테이블
CREATE TABLE IF NOT EXISTS landing_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  template_type TEXT NOT NULL,
  content_json TEXT NOT NULL,
  html_content TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_landing_pages_user_id ON landing_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);
CREATE INDEX IF NOT EXISTS idx_landing_pages_created_at ON landing_pages(created_at);
