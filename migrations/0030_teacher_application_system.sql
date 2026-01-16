-- 선생님 등록 신청 시스템
-- 2026-01-16

-- 선생님 등록 신청 테이블
CREATE TABLE IF NOT EXISTS teacher_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  academy_name TEXT NOT NULL, -- 소속하고 싶은 학원명
  director_email TEXT, -- 원장님 이메일 (선택)
  verification_code TEXT, -- 인증 코드 (원장님이 제공)
  status TEXT DEFAULT 'pending', -- pending(대기중), approved(승인), rejected(거부)
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  processed_by INTEGER, -- 승인/거부한 원장님 ID
  reject_reason TEXT,
  FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- 학원별 인증 코드 테이블
CREATE TABLE IF NOT EXISTS academy_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, -- 원장님 ID
  academy_name TEXT NOT NULL,
  verification_code TEXT NOT NULL UNIQUE, -- 6자리 코드
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_applications_status ON teacher_applications(status);
CREATE INDEX IF NOT EXISTS idx_teacher_applications_email ON teacher_applications(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON academy_verification_codes(verification_code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON academy_verification_codes(user_id);

-- 기존 원장님 계정에 대한 인증 코드 생성 (샘플)
INSERT OR IGNORE INTO academy_verification_codes (user_id, academy_name, verification_code, is_active)
SELECT id, academy_name, 
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', abs(random()) % 36 + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', abs(random()) % 36 + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', abs(random()) % 36 + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', abs(random()) % 36 + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', abs(random()) % 36 + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', abs(random()) % 36 + 1, 1) as verification_code,
  1
FROM users 
WHERE role = 'user' AND (user_type = 'director' OR user_type IS NULL)
LIMIT 10;
