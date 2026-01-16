-- 선생님 학부모 연락처 권한 관리
-- 2026-01-16

-- 선생님별 권한 설정 테이블
CREATE TABLE IF NOT EXISTS teacher_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  permission_key TEXT NOT NULL,
  permission_value INTEGER DEFAULT 0, -- 0: 비활성, 1: 활성
  granted_by INTEGER NOT NULL, -- 원장님 ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE(teacher_id, permission_key)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_permissions_teacher ON teacher_permissions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_permissions_key ON teacher_permissions(permission_key);

-- 권한 키 설명:
-- 'view_parent_contact': 학부모 연락처 조회 권한

-- 기존 선생님들에게 기본 권한 설정 (비활성)
INSERT OR IGNORE INTO teacher_permissions (teacher_id, permission_key, permission_value, granted_by)
SELECT id, 'view_parent_contact', 0, parent_user_id
FROM users
WHERE user_type = 'teacher' AND parent_user_id IS NOT NULL;
