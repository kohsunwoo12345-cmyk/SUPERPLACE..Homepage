-- 기존 사용자들에게 user_type 설정
-- 관리자는 그대로, 일반 회원은 director로 설정

-- 관리자 계정은 그대로 유지
UPDATE users 
SET user_type = 'admin' 
WHERE role = 'admin' AND user_type IS NULL;

-- 일반 회원은 원장님(director)으로 설정
UPDATE users 
SET user_type = 'director' 
WHERE role IN ('user', 'member') AND user_type IS NULL;

-- 결과 확인용 쿼리 (실행 X, 참고용)
-- SELECT id, email, name, role, user_type FROM users;
