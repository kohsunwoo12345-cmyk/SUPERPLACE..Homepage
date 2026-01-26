-- 꾸메땅학원(kumetang@gmail.com) 학생 데이터 확인

-- 1. 사용자 정보 확인
SELECT id, email, name, academy_id 
FROM users 
WHERE email = 'kumetang@gmail.com';

-- 2. 학생 데이터 확인 (모든 상태)
SELECT 
  id,
  name,
  parent_name,
  parent_phone,
  academy_id,
  status,
  created_at,
  updated_at
FROM students 
WHERE academy_id IN (
  SELECT id FROM users WHERE email = 'kumetang@gmail.com'
)
ORDER BY created_at DESC;

-- 3. 삭제된 학생 확인 (status='deleted' 또는 'inactive')
SELECT 
  id,
  name,
  status,
  created_at,
  updated_at
FROM students 
WHERE academy_id IN (
  SELECT id FROM users WHERE email = 'kumetang@gmail.com'
)
AND status IN ('deleted', 'inactive')
ORDER BY updated_at DESC;

-- 4. 전체 학생 수 확인
SELECT 
  status,
  COUNT(*) as count
FROM students 
WHERE academy_id IN (
  SELECT id FROM users WHERE email = 'kumetang@gmail.com'
)
GROUP BY status;

-- 5. 최근 삭제/수정된 학생 (updated_at 기준)
SELECT 
  id,
  name,
  parent_name,
  status,
  created_at,
  updated_at
FROM students 
WHERE academy_id IN (
  SELECT id FROM users WHERE email = 'kumetang@gmail.com'
)
AND updated_at > datetime('now', '-1 day')
ORDER BY updated_at DESC;
