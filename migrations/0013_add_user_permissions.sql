-- 사용자 권한 테이블
CREATE TABLE IF NOT EXISTS user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  permission_type TEXT NOT NULL,  -- 'program' 또는 'tool'
  permission_name TEXT NOT NULL,  -- 'naver-place', 'blog', 'funnel', 'place-keyword-analyzer' 등
  granted_by INTEGER,             -- 권한 부여한 관리자 ID
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,            -- 만료일 (NULL이면 무제한)
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_type ON user_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active);

-- 관리자에게 모든 권한 자동 부여
INSERT INTO user_permissions (user_id, permission_type, permission_name, is_active)
SELECT id, 'program', 'naver-place', 1 FROM users WHERE role = 'admin'
UNION ALL
SELECT id, 'program', 'blog', 1 FROM users WHERE role = 'admin'
UNION ALL
SELECT id, 'program', 'funnel', 1 FROM users WHERE role = 'admin'
UNION ALL
SELECT id, 'tool', 'all', 1 FROM users WHERE role = 'admin';
