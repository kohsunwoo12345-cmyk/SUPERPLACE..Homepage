-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  academy_name TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 관리자 계정
INSERT OR IGNORE INTO users (email, password, name, role, academy_name, phone) 
VALUES ('admin@superplace.co.kr', 'admin1234!', '관리자', 'admin', '슈퍼플레이스', '010-0000-0000');

-- 테스트 사용자
INSERT OR IGNORE INTO users (email, password, name, role, academy_name, phone) 
VALUES 
  ('test1@superplace.co.kr', 'test1234!', '김학원', 'user', '꾸메땅학원 분당점', '010-1234-5678');
