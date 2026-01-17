-- 🔍 테이블 구조 확인

-- 1. academy_verification_codes 테이블 구조 확인
PRAGMA table_info(academy_verification_codes);

-- 2. 모든 데이터 확인
SELECT * FROM academy_verification_codes LIMIT 5;

-- 3. users 테이블에서 director@test.com 확인
SELECT id, email, name, academy_name FROM users WHERE email = 'director@test.com';
