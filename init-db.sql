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

-- 문의 테이블
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  academy_name TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 권한 테이블
CREATE TABLE IF NOT EXISTS user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  program_key TEXT NOT NULL,
  granted_by INTEGER,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE(user_id, program_key)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_permissions_user ON user_permissions(user_id);

-- 관리자 계정 생성
INSERT OR IGNORE INTO users (email, password, name, role, academy_name, phone) 
VALUES ('admin@superplace.co.kr', 'admin1234!', '관리자', 'admin', '슈퍼플레이스', '010-0000-0000');

-- 테스트 사용자 생성
INSERT OR IGNORE INTO users (email, password, name, role, academy_name, phone) 
VALUES 
  ('test1@superplace.co.kr', 'test1234!', '김학원', 'user', '꾸메땅학원 분당점', '010-1234-5678'),
  ('test2@superplace.co.kr', 'test1234!', '이영희', 'user', '슈퍼학원 강남점', '010-2345-6789'),
  ('test3@superplace.co.kr', 'test1234!', '박철수', 'user', '탑학원 목동점', '010-3456-7890');
