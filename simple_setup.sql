-- ============================================
-- 간단 설치 스크립트 (복사해서 붙여넣기만 하세요!)
-- ============================================

-- 1. user_type 컬럼 추가 (에러 나도 괜찮음)
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'director';
ALTER TABLE users ADD COLUMN parent_user_id INTEGER;

-- 2. 기존 사용자를 원장님으로 설정
UPDATE users SET user_type = 'director' WHERE user_type IS NULL;

-- 3. 인증 코드 테이블
CREATE TABLE IF NOT EXISTS academy_verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- 4. 선생님 신청 테이블
CREATE TABLE IF NOT EXISTS teacher_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verification_code TEXT NOT NULL,
    academy_name TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'pending',
    director_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 테스트 원장님 계정 (이메일: director@test.com, 비밀번호: test1234!)
INSERT OR IGNORE INTO users (id, email, password, name, phone, academy_name, academy_location, user_type, role, points, created_at)
VALUES (999, 'director@test.com', 'test1234!', '김원장', '010-1234-5678', '슈퍼플레이스 학원', '서울 강남구', 'director', 'member', 0, datetime('now'));

-- 6. 테스트 인증 코드 생성 (코드: ABC123)
INSERT OR IGNORE INTO academy_verification_codes (user_id, code, is_active)
VALUES (999, 'ABC123', 1);

-- 7. 확인 쿼리 (결과가 보이면 성공!)
SELECT 
    '✅ 설치 완료!' as status,
    (SELECT COUNT(*) FROM users WHERE user_type = 'director') as 원장님수,
    (SELECT COUNT(*) FROM academy_verification_codes) as 인증코드수;
