-- 사용자 권한 관리 시스템
-- 관리자가 사용자별로 프로그램 접근 권한을 제어

-- user_permissions 테이블 생성
CREATE TABLE IF NOT EXISTS user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  program_key TEXT NOT NULL,
  granted_by INTEGER,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE(user_id, program_key)
);

-- 프로그램 키 목록:
-- 'search_volume' - 네이버 검색량 조회
-- 'sms' - SMS 발송 시스템
-- 'landing_builder' - 랜딩페이지 빌더
-- 'analytics' - 분석 도구

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_program_key ON user_permissions(program_key);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active);
