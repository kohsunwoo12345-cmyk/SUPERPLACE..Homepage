-- users 테이블에 user_type 컬럼 추가
-- 이미 있으면 에러 무시

-- 1. user_type 컬럼 추가 (없으면)
-- SQLite는 IF NOT EXISTS를 지원하지 않으므로 에러 무시
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'director';

-- 2. parent_user_id 컬럼 추가 (없으면)
ALTER TABLE users ADD COLUMN parent_user_id INTEGER;

-- 3. 기존 사용자들의 user_type 설정
UPDATE users SET user_type = 'director' WHERE user_type IS NULL;

-- 4. 확인
SELECT 
  id, 
  email, 
  name, 
  user_type, 
  parent_user_id, 
  academy_name
FROM users 
LIMIT 10;
