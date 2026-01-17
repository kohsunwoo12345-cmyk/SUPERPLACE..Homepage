-- ✅ 테이블 완전 재생성 및 인증 코드 생성

-- 1. 기존 테이블 삭제 (있으면)
DROP TABLE IF EXISTS academy_verification_codes;

-- 2. 테이블 새로 생성
CREATE TABLE academy_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. 인덱스 생성
CREATE INDEX idx_verification_codes_user ON academy_verification_codes(user_id);
CREATE INDEX idx_verification_codes_code ON academy_verification_codes(code);

-- 4. director@test.com에 ABC123 코드 생성
INSERT INTO academy_verification_codes (user_id, code, is_active, created_at)
SELECT id, 'ABC123', 1, datetime('now')
FROM users 
WHERE email = 'director@test.com';

-- 5. 확인
SELECT 
  avc.id,
  avc.user_id,
  u.email,
  u.name,
  u.academy_name,
  avc.code as '인증코드',
  avc.is_active as '활성',
  avc.created_at as '생성일시'
FROM academy_verification_codes avc
JOIN users u ON avc.user_id = u.id;
