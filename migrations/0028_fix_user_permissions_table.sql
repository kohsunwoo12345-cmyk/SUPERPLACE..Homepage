-- user_permissions 테이블 구조 수정
-- permission_type, permission_name을 program_key로 변경

-- 기존 테이블 백업
DROP TABLE IF EXISTS user_permissions_old;
ALTER TABLE user_permissions RENAME TO user_permissions_old;

-- 새 테이블 생성 (올바른 구조)
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
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_program_key ON user_permissions(program_key);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active);

-- 기존 데이터가 있다면 마이그레이션 (선택사항)
-- INSERT INTO user_permissions (user_id, program_key, granted_by, granted_at, is_active)
-- SELECT user_id, permission_name, granted_by, granted_at, is_active 
-- FROM user_permissions_old WHERE EXISTS (SELECT 1 FROM user_permissions_old);
