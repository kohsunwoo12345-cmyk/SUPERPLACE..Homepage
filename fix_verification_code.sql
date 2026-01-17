-- 인증 코드 확실하게 생성하기
-- 2026-01-17

-- 1. 기존 비활성 코드 삭제 (정리)
DELETE FROM academy_verification_codes WHERE is_active = 0;

-- 2. 모든 원장님 계정에 대해 인증 코드 생성
-- 먼저 기존 활성 코드가 있는지 확인
INSERT OR REPLACE INTO academy_verification_codes (id, user_id, academy_name, verification_code, is_active, created_at)
SELECT 
  COALESCE((SELECT id FROM academy_verification_codes WHERE user_id = u.id AND is_active = 1 LIMIT 1), NULL),
  u.id,
  u.academy_name,
  COALESCE(
    (SELECT verification_code FROM academy_verification_codes WHERE user_id = u.id AND is_active = 1 LIMIT 1),
    'ABC' || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', abs(random()) % 36 + 1, 3)
  ),
  1,
  CURRENT_TIMESTAMP
FROM users u
WHERE u.user_type = 'director' OR (u.user_type IS NULL AND u.role = 'user');

-- 3. director@test.com 계정에 확실하게 ABC123 코드 생성
INSERT OR REPLACE INTO academy_verification_codes (user_id, academy_name, verification_code, is_active, created_at)
SELECT 
  id,
  academy_name,
  'ABC123',
  1,
  CURRENT_TIMESTAMP
FROM users 
WHERE email = 'director@test.com';

-- 4. 확인 쿼리
SELECT 
  u.id,
  u.email,
  u.name,
  u.academy_name,
  avc.verification_code,
  avc.is_active,
  avc.created_at
FROM users u
LEFT JOIN academy_verification_codes avc ON u.id = avc.user_id AND avc.is_active = 1
WHERE u.email = 'director@test.com';

-- 5. 모든 활성 인증 코드 확인
SELECT 
  avc.id,
  avc.user_id,
  u.email,
  u.name,
  avc.academy_name,
  avc.verification_code,
  avc.is_active,
  avc.created_at
FROM academy_verification_codes avc
JOIN users u ON avc.user_id = u.id
WHERE avc.is_active = 1
ORDER BY avc.created_at DESC;
